package expo.modules.qrtools

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

/** The name that `index.ts` registers for the result sheet of a screen scan. */
private const val SCAN_RESULT_COMPONENT = "ScanResultOverlay"
private const val VALUE_KEY = "value"

/**
 * Transparent activity that shows the result sheet of a screen scan.
 *
 * The activity runs the same JavaScript as the app, but it renders only the sheet.
 * The app that the user is reading stays visible below the sheet, and the camera
 * screen of QR Scanner does not open.
 */
class ScanResultActivity : ReactActivity() {
  /** @return The JavaScript component that this activity renders. */
  override fun getMainComponentName(): String = SCAN_RESULT_COMPONENT

  /** @return A delegate that passes the decoded value to the JavaScript component. */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return object : DefaultReactActivityDelegate(this, mainComponentName) {
      /** @return The initial props of the JavaScript component. */
      override fun getLaunchOptions(): Bundle = createInitialProps()
    }
  }

  /** @return A bundle with the decoded value from the intent. */
  private fun createInitialProps(): Bundle {
    val initialProps = Bundle()
    initialProps.putString(VALUE_KEY, intent.getStringExtra(VALUE_KEY))
    return initialProps
  }

  /** The intent factory for the callers of this activity. */
  companion object {
    /**
     * Creates the intent that shows a scanned value.
     *
     * @param context The caller context.
     * @param value The text decoded from the QR code.
     * @return The intent for this activity.
     */
    fun createIntent(context: Context, value: String): Intent {
      return Intent(context, ScanResultActivity::class.java).putExtra(VALUE_KEY, value)
    }
  }
}
