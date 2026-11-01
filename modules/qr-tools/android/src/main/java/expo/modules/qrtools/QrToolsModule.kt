package expo.modules.qrtools

import android.content.Intent
import android.net.wifi.WifiNetworkSuggestion
import android.os.Build
import android.provider.CalendarContract
import android.provider.ContactsContract
import android.provider.Settings
import androidx.annotation.RequiresApi
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

private const val WIFI_ADD_REQUEST_CODE = 7301
private const val SECURITY_WPA = "wpa"
private const val SECURITY_SAE = "sae"

private const val RESULT_ADDED = "added"
private const val RESULT_ALREADY_SAVED = "alreadySaved"
private const val RESULT_FAILED = "failed"
private const val RESULT_CANCELLED = "cancelled"

/** Wi-Fi network details from JavaScript. */
class WifiNetworkRecord : Record {
  /** The network name. */
  @Field
  val ssid: String = ""

  /** The network password. Open networks have no password. */
  @Field
  val password: String? = null

  /** The security type: "open", "wpa", or "sae". */
  @Field
  val security: String = "open"

  /** True if the network does not broadcast its name. */
  @Field
  val isHidden: Boolean = false
}

/** Contact details that fill the Android contact form. */
class ContactRecord : Record {
  /** The full name. */
  @Field
  val name: String? = null

  /** The phone number. */
  @Field
  val phoneNumber: String? = null

  /** The email address. */
  @Field
  val email: String? = null

  /** The company name. */
  @Field
  val organization: String? = null

  /** The job title. */
  @Field
  val jobTitle: String? = null

  /** The postal address. */
  @Field
  val address: String? = null
}

/** Event details that fill the Android calendar form. */
class CalendarEventRecord : Record {
  /** The event title. */
  @Field
  val title: String? = null

  /** The event location. */
  @Field
  val location: String? = null

  /** The event description. */
  @Field
  val description: String? = null

  /** The start time in milliseconds since the Unix epoch. */
  @Field
  val startTimeMs: Double? = null

  /** The end time in milliseconds since the Unix epoch. */
  @Field
  val endTimeMs: Double? = null

  /** True if the event lasts all day. */
  @Field
  val isAllDay: Boolean = false
}

/** Opens the Android forms for the result actions, and closes the screen scan sheet. */
class QrToolsModule : Module() {
  private var pendingWifiPromise: Promise? = null

  /** Declares the functions that JavaScript can call. */
  override fun definition() = ModuleDefinition {
    Name("QrTools")

    AsyncFunction("addWifiNetwork") { network: WifiNetworkRecord, promise: Promise ->
      requestWifiAdd(network, promise)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("openContactForm") { contact: ContactRecord ->
      appContext.throwingActivity.startActivity(createContactIntent(contact))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("openCalendarEventForm") { event: CalendarEventRecord ->
      appContext.throwingActivity.startActivity(createCalendarEventIntent(event))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("closeScanResult") {
      closeScanResult()
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, payload ->
      if (payload.requestCode == WIFI_ADD_REQUEST_CODE) {
        resolveWifiRequest(payload.data)
      }
    }
  }

  /** Closes the screen scan sheet. Other activities stay open. */
  private fun closeScanResult() {
    val scanResultActivity = appContext.currentActivity as? ScanResultActivity
    scanResultActivity?.finish()
  }

  /**
   * Opens the Android prompt that asks the user to save a Wi-Fi network.
   *
   * @param network The network to save.
   * @param promise Resolves with the result of the prompt.
   */
  private fun requestWifiAdd(network: WifiNetworkRecord, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      promise.reject("ERR_WIFI_ADD_UNSUPPORTED", "This Android version needs manual Wi-Fi setup.", null)
      return
    }

    try {
      val suggestion = createWifiSuggestion(network)
      val intent = Intent(Settings.ACTION_WIFI_ADD_NETWORKS)
      intent.putParcelableArrayListExtra(Settings.EXTRA_WIFI_NETWORK_LIST, arrayListOf(suggestion))

      pendingWifiPromise?.resolve(RESULT_CANCELLED)
      pendingWifiPromise = promise
      appContext.throwingActivity.startActivityForResult(intent, WIFI_ADD_REQUEST_CODE)
    } catch (error: RuntimeException) {
      pendingWifiPromise = null
      promise.reject("ERR_WIFI_ADD_FAILED", error.message, error)
    }
  }

  /**
   * Converts Wi-Fi details into the Android network type.
   *
   * @param network The details from JavaScript.
   * @return The network for the Android prompt.
   * @throws IllegalArgumentException If Android rejects the name or the password.
   */
  @RequiresApi(Build.VERSION_CODES.R)
  private fun createWifiSuggestion(network: WifiNetworkRecord): WifiNetworkSuggestion {
    val builder = WifiNetworkSuggestion.Builder()
      .setSsid(network.ssid)
      .setIsHiddenSsid(network.isHidden)
    val password = network.password.orEmpty()

    when (network.security) {
      SECURITY_WPA -> builder.setWpa2Passphrase(password)
      SECURITY_SAE -> builder.setWpa3Passphrase(password)
    }

    return builder.build()
  }

  /**
   * Resolves the waiting Wi-Fi promise.
   *
   * @param data The result data of the Android prompt.
   */
  private fun resolveWifiRequest(data: Intent?) {
    val promise = pendingWifiPromise ?: return
    pendingWifiPromise = null
    promise.resolve(readWifiResult(data))
  }

  /**
   * Reads the result of the Android prompt.
   *
   * @param data The result data of the Android prompt.
   * @return "added", "alreadySaved", "failed", or "cancelled".
   */
  private fun readWifiResult(data: Intent?): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      return RESULT_FAILED
    }

    val networkResults = data?.getIntegerArrayListExtra(Settings.EXTRA_WIFI_NETWORK_RESULT_LIST)
    return when (networkResults?.firstOrNull()) {
      Settings.ADD_WIFI_RESULT_SUCCESS -> RESULT_ADDED
      Settings.ADD_WIFI_RESULT_ALREADY_EXISTS -> RESULT_ALREADY_SAVED
      Settings.ADD_WIFI_RESULT_ADD_OR_UPDATE_FAILED -> RESULT_FAILED
      else -> RESULT_CANCELLED
    }
  }

  /**
   * Creates the intent for the Android contact form.
   *
   * @param contact The values that fill the form.
   * @return An intent that needs no contacts permission.
   */
  private fun createContactIntent(contact: ContactRecord): Intent {
    return Intent(ContactsContract.Intents.Insert.ACTION)
      .setType(ContactsContract.RawContacts.CONTENT_TYPE)
      .putExtra(ContactsContract.Intents.Insert.NAME, contact.name)
      .putExtra(ContactsContract.Intents.Insert.PHONE, contact.phoneNumber)
      .putExtra(ContactsContract.Intents.Insert.EMAIL, contact.email)
      .putExtra(ContactsContract.Intents.Insert.COMPANY, contact.organization)
      .putExtra(ContactsContract.Intents.Insert.JOB_TITLE, contact.jobTitle)
      .putExtra(ContactsContract.Intents.Insert.POSTAL, contact.address)
  }

  /**
   * Creates the intent for the Android calendar form.
   *
   * @param event The values that fill the form.
   * @return An intent that needs no calendar permission.
   */
  private fun createCalendarEventIntent(event: CalendarEventRecord): Intent {
    val intent = Intent(Intent.ACTION_INSERT)
      .setData(CalendarContract.Events.CONTENT_URI)
      .putExtra(CalendarContract.Events.TITLE, event.title)
      .putExtra(CalendarContract.Events.EVENT_LOCATION, event.location)
      .putExtra(CalendarContract.Events.DESCRIPTION, event.description)
      .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, event.isAllDay)

    event.startTimeMs?.let { startTimeMs ->
      intent.putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, startTimeMs.toLong())
    }
    event.endTimeMs?.let { endTimeMs ->
      intent.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endTimeMs.toLong())
    }

    return intent
  }
}
