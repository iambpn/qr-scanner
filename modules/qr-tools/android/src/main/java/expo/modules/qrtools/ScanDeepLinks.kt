package expo.modules.qrtools

import android.content.Context
import android.content.Intent
import android.net.Uri

private const val APP_SCHEME = "qrscanner"
private const val CAMERA_HOST = "camera"
private const val SCAN_RESULT_HOST = "scan-result"
private const val VALUE_PARAMETER = "value"

/** Builds the intents that open the React Native app from native tile code. */
internal object ScanDeepLinks {
  /**
   * Creates the intent that opens the app on the camera.
   *
   * @param context The context that resolves the app package.
   * @return An intent for the app's main activity.
   */
  fun createCameraIntent(context: Context): Intent {
    val uri = Uri.Builder().scheme(APP_SCHEME).authority(CAMERA_HOST).build()
    return createAppIntent(context, uri)
  }

  /**
   * Creates the intent that opens the app and shows a scanned value.
   *
   * @param context The context that resolves the app package.
   * @param value The text decoded from the QR code.
   * @return An intent for the app's main activity.
   */
  fun createScanResultIntent(context: Context, value: String): Intent {
    val uri = Uri.Builder()
      .scheme(APP_SCHEME)
      .authority(SCAN_RESULT_HOST)
      .appendQueryParameter(VALUE_PARAMETER, value)
      .build()
    return createAppIntent(context, uri)
  }

  /**
   * Wraps a link in an intent for this app only.
   *
   * @param context The context that resolves the app package.
   * @param uri The deep link.
   * @return An intent that starts a new task when the app is not open.
   */
  private fun createAppIntent(context: Context, uri: Uri): Intent {
    return Intent(Intent.ACTION_VIEW, uri)
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }
}
