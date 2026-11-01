package expo.modules.qrtools

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionConfig
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ResultReceiver
import android.widget.Toast
import androidx.core.content.ContextCompat

private const val SCREEN_CAPTURE_REQUEST_CODE = 7302

/**
 * Transparent activity that runs the screen scan from the tile.
 *
 * The activity asks for screen capture consent and starts [ScreenCaptureService].
 * The activity stays open during the capture because Android lets a visible
 * activity open [ScanResultActivity], but blocks that action from a background
 * service.
 */
class ScreenCaptureActivity : Activity() {
  /** Requests consent once. An activity restored by Android already has a request open. */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (savedInstanceState == null) {
      startActivityForResult(createConsentIntent(), SCREEN_CAPTURE_REQUEST_CODE)
    }
  }

  /**
   * Creates the system consent prompt.
   *
   * On Android 14 and later, the config requests the full screen. The default
   * prompt can select one app, and that app could be this transparent activity.
   *
   * @return The intent for the consent prompt.
   */
  private fun createConsentIntent(): Intent {
    val projectionManager = getSystemService(MediaProjectionManager::class.java)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val config = MediaProjectionConfig.createConfigForDefaultDisplay()
      return projectionManager.createScreenCaptureIntent(config)
    }

    return projectionManager.createScreenCaptureIntent()
  }

  /** Starts the capture after consent, or closes this activity if the user declines. */
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)

    if (requestCode != SCREEN_CAPTURE_REQUEST_CODE) {
      return
    }

    if (resultCode != RESULT_OK || data == null) {
      finish()
      return
    }

    startCaptureService(resultCode, data)
  }

  /**
   * Starts the foreground service that reads the screen.
   *
   * @param resultCode The result code of the consent prompt.
   * @param consentData The result data of the consent prompt.
   */
  private fun startCaptureService(resultCode: Int, consentData: Intent) {
    val captureReceiver = object : ResultReceiver(Handler(Looper.getMainLooper())) {
      /** Passes the capture result to the activity. */
      override fun onReceiveResult(captureStatus: Int, resultData: Bundle?) {
        handleCaptureResult(captureStatus, resultData?.getString(ScreenCaptureService.KEY_VALUE))
      }
    }
    val serviceIntent = ScreenCaptureService.createIntent(
      this,
      resultCode,
      consentData,
      captureReceiver,
    )

    ContextCompat.startForegroundService(this, serviceIntent)
  }

  /**
   * Shows the value in the result sheet, or shows a short message. In both cases,
   * the user stays on the current screen.
   *
   * @param captureStatus A status value from [ScreenCaptureService].
   * @param value The decoded text, if the service found a QR code.
   */
  private fun handleCaptureResult(captureStatus: Int, value: String?) {
    if (captureStatus == ScreenCaptureService.STATUS_FOUND && value != null) {
      startActivity(ScanResultActivity.createIntent(this, value))
    } else {
      showFailureMessage(captureStatus)
    }

    finish()
  }

  /**
   * Shows why the screen scan did not give a result.
   *
   * @param captureStatus A status value from [ScreenCaptureService].
   */
  private fun showFailureMessage(captureStatus: Int) {
    val messageId = if (captureStatus == ScreenCaptureService.STATUS_NOT_FOUND) {
      R.string.qr_tools_no_qr_found
    } else {
      R.string.qr_tools_capture_failed
    }

    Toast.makeText(this, messageId, Toast.LENGTH_LONG).show()
  }
}
