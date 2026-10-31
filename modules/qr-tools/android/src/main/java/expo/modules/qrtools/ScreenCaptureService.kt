package expo.modules.qrtools

import android.app.Activity
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.ResultReceiver
import android.util.DisplayMetrics
import android.view.Display
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.IntentCompat
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage

private const val NOTIFICATION_CHANNEL_ID = "qr_tools_screen_capture"
private const val NOTIFICATION_ID = 7303
private const val VIRTUAL_DISPLAY_NAME = "QrToolsScreenCapture"
private const val IMAGE_READER_MAX_IMAGES = 2

/** Wait time that lets the consent prompt leave the screen before the first frame. */
private const val FIRST_FRAME_DELAY_MS = 700L
private const val NEXT_FRAME_DELAY_MS = 300L
private const val MAX_FRAME_ATTEMPTS = 6

private const val EXTRA_RESULT_CODE = "resultCode"
private const val EXTRA_CONSENT_DATA = "consentData"
private const val EXTRA_RESULT_RECEIVER = "resultReceiver"

/**
 * Foreground service that captures the screen and decodes a QR code from it.
 *
 * Android requires a foreground service for MediaProjection. The service reads a
 * few frames, sends one result to the receiver, and stops. The service keeps no
 * frame after the scan.
 */
class ScreenCaptureService : Service() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val scanNextFrame = Runnable { scanLatestFrame() }
  private val projectionCallback = object : MediaProjection.Callback() {
    /** Ends the scan if the user or the system stops the capture. */
    override fun onStop() {
      finishCapture(STATUS_FAILED, null)
    }
  }

  private var mediaProjection: MediaProjection? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var imageReader: ImageReader? = null
  private var barcodeScanner: BarcodeScanner? = null
  private var resultReceiver: ResultReceiver? = null
  private var frameAttemptsLeft = MAX_FRAME_ATTEMPTS
  private var isCaptureFinished = false

  /** This service does not support binding. */
  override fun onBind(intent: Intent?): IBinder? = null

  /** Enters the foreground and starts the capture with the consent from the intent. */
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Android requires foreground state before the service gets the MediaProjection.
    startForegroundWithNotification()

    if (intent != null) {
      startCapture(intent)
    } else {
      stopService()
    }

    return START_NOT_STICKY
  }

  /** Shows the notification that Android requires for a foreground service. */
  private fun startForegroundWithNotification() {
    val channel = NotificationChannelCompat
      .Builder(NOTIFICATION_CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_LOW)
      .setName(getString(R.string.qr_tools_capture_channel_name))
      .build()
    NotificationManagerCompat.from(this).createNotificationChannel(channel)

    val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
      .setContentTitle(getString(R.string.qr_tools_capture_notification_title))
      .setSmallIcon(R.drawable.qr_tools_screen_tile)
      .build()
    val serviceType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
    } else {
      0
    }

    ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, serviceType)
  }

  /**
   * Reads the intent extras and starts the virtual display.
   *
   * @param intent The intent from [createIntent].
   */
  private fun startCapture(intent: Intent) {
    resultReceiver = IntentCompat.getParcelableExtra(
      intent,
      EXTRA_RESULT_RECEIVER,
      ResultReceiver::class.java,
    )

    val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
    val consentData = IntentCompat.getParcelableExtra(
      intent,
      EXTRA_CONSENT_DATA,
      Intent::class.java,
    )
    if (consentData == null) {
      finishCapture(STATUS_FAILED, null)
      return
    }

    try {
      startVirtualDisplay(resultCode, consentData)
      mainHandler.postDelayed(scanNextFrame, FIRST_FRAME_DELAY_MS)
    } catch (_: RuntimeException) {
      finishCapture(STATUS_FAILED, null)
    }
  }

  /**
   * Mirrors the screen into an image reader.
   *
   * @param resultCode The result code of the consent prompt.
   * @param consentData The result data of the consent prompt.
   * @throws IllegalStateException If Android does not give a capture session.
   */
  private fun startVirtualDisplay(resultCode: Int, consentData: Intent) {
    val projectionManager = getSystemService(MediaProjectionManager::class.java)
    val projection = projectionManager.getMediaProjection(resultCode, consentData)
      ?: throw IllegalStateException("Android gave no screen capture session.")
    val metrics = readDisplayMetrics()
    val reader = ImageReader.newInstance(
      metrics.widthPixels,
      metrics.heightPixels,
      PixelFormat.RGBA_8888,
      IMAGE_READER_MAX_IMAGES,
    )

    mediaProjection = projection
    imageReader = reader
    barcodeScanner = createBarcodeScanner()

    // Android 14 requires this callback before createVirtualDisplay.
    projection.registerCallback(projectionCallback, mainHandler)
    virtualDisplay = projection.createVirtualDisplay(
      VIRTUAL_DISPLAY_NAME,
      metrics.widthPixels,
      metrics.heightPixels,
      metrics.densityDpi,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
      reader.surface,
      null,
      mainHandler,
    )
  }

  /** @return The full size of the default display, with the system bars included. */
  private fun readDisplayMetrics(): DisplayMetrics {
    val displayManager = getSystemService(DisplayManager::class.java)
    val display = displayManager.getDisplay(Display.DEFAULT_DISPLAY)
    val metrics = DisplayMetrics()

    @Suppress("DEPRECATION")
    display.getRealMetrics(metrics)

    return metrics
  }

  /** @return A scanner that detects QR codes only. */
  private fun createBarcodeScanner(): BarcodeScanner {
    val options = BarcodeScannerOptions.Builder()
      .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
      .build()

    return BarcodeScanning.getClient(options)
  }

  /** Decodes the newest frame. If the frame has no QR code, tries a later frame. */
  private fun scanLatestFrame() {
    val scanner = barcodeScanner
    if (isCaptureFinished || scanner == null) {
      return
    }

    frameAttemptsLeft -= 1

    val bitmap = acquireLatestBitmap()
    if (bitmap == null) {
      scheduleNextFrameOrFinish()
      return
    }

    val image = InputImage.fromBitmap(bitmap, 0)
    scanner.process(image)
      .addOnSuccessListener { barcodes -> handleDetectedBarcodes(barcodes) }
      .addOnFailureListener { finishCapture(STATUS_FAILED, null) }
  }

  /**
   * Copies the newest frame into a bitmap.
   *
   * @return The frame, or null if no new frame exists. Android sends no frame
   * while the screen content does not change.
   */
  private fun acquireLatestBitmap(): Bitmap? {
    val image = imageReader?.acquireLatestImage() ?: return null

    try {
      val plane = image.planes[0]
      // The row stride can include padding after the last visible pixel of each row.
      val paddedWidth = plane.rowStride / plane.pixelStride
      val paddedBitmap = Bitmap.createBitmap(paddedWidth, image.height, Bitmap.Config.ARGB_8888)
      paddedBitmap.copyPixelsFromBuffer(plane.buffer)

      return Bitmap.createBitmap(paddedBitmap, 0, 0, image.width, image.height)
    } finally {
      image.close()
    }
  }

  /**
   * Sends the value of the largest QR code. The largest code is the most likely
   * target when the screen shows more than one.
   *
   * @param barcodes The QR codes that ML Kit found in the frame.
   */
  private fun handleDetectedBarcodes(barcodes: List<Barcode>) {
    val readableBarcodes = barcodes.filter { barcode -> barcode.rawValue != null }
    val largestBarcode = readableBarcodes.maxByOrNull { barcode -> calculateArea(barcode) }

    if (largestBarcode != null) {
      finishCapture(STATUS_FOUND, largestBarcode.rawValue)
    } else {
      scheduleNextFrameOrFinish()
    }
  }

  /**
   * Calculates the area of a QR code on the screen.
   *
   * @param barcode The detected QR code.
   * @return The area in pixels, or 0 if ML Kit gave no bounds.
   */
  private fun calculateArea(barcode: Barcode): Int {
    val bounds = barcode.boundingBox ?: return 0
    return bounds.width() * bounds.height()
  }

  /** Tries another frame, or reports that the screen has no readable QR code. */
  private fun scheduleNextFrameOrFinish() {
    if (frameAttemptsLeft > 0) {
      mainHandler.postDelayed(scanNextFrame, NEXT_FRAME_DELAY_MS)
    } else {
      finishCapture(STATUS_NOT_FOUND, null)
    }
  }

  /**
   * Releases the capture resources, sends the result, and stops the service.
   * Later calls have no effect.
   *
   * @param captureStatus One of the status values in the companion object.
   * @param value The decoded text, if a QR code was found.
   */
  private fun finishCapture(captureStatus: Int, value: String?) {
    if (isCaptureFinished) {
      return
    }

    isCaptureFinished = true
    releaseCapture()

    val resultData = Bundle()
    resultData.putString(KEY_VALUE, value)
    resultReceiver?.send(captureStatus, resultData)

    stopService()
  }

  /** Closes the capture resources in reverse order of creation. */
  private fun releaseCapture() {
    mainHandler.removeCallbacks(scanNextFrame)

    virtualDisplay?.release()
    virtualDisplay = null

    barcodeScanner?.close()
    barcodeScanner = null

    imageReader?.close()
    imageReader = null

    mediaProjection?.unregisterCallback(projectionCallback)
    mediaProjection?.stop()
    mediaProjection = null
  }

  /** Removes the notification and stops this service. */
  private fun stopService() {
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  /** Makes sure that no capture continues if Android destroys the service early. */
  override fun onDestroy() {
    finishCapture(STATUS_FAILED, null)
    super.onDestroy()
  }

  /** Constants and the intent factory for the callers of this service. */
  companion object {
    /** The service found a QR code. The result data contains [KEY_VALUE]. */
    const val STATUS_FOUND = 0

    /** The service read the screen, but the screen had no readable QR code. */
    const val STATUS_NOT_FOUND = 1

    /** The capture failed, or the user or the system stopped the capture. */
    const val STATUS_FAILED = 2

    /** The result data key for the decoded text. */
    const val KEY_VALUE = "value"

    /**
     * Creates the intent that starts a capture.
     *
     * @param context The caller context.
     * @param resultCode The result code of the consent prompt.
     * @param consentData The result data of the consent prompt.
     * @param resultReceiver The receiver of the single capture result.
     * @return The intent for this service.
     */
    fun createIntent(
      context: Context,
      resultCode: Int,
      consentData: Intent,
      resultReceiver: ResultReceiver,
    ): Intent {
      return Intent(context, ScreenCaptureService::class.java)
        .putExtra(EXTRA_RESULT_CODE, resultCode)
        .putExtra(EXTRA_CONSENT_DATA, consentData)
        .putExtra(EXTRA_RESULT_RECEIVER, resultReceiver)
    }
  }
}
