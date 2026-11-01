package expo.modules.qrtools

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * Base class for the Quick Settings tiles.
 *
 * The tiles run one action on each tap, so they have no on or off state.
 */
abstract class ScanTileService : TileService() {
  /**
   * Creates the intent that the tile starts.
   *
   * @return The intent for the scan action of the tile.
   */
  protected abstract fun createScanIntent(): Intent

  /** Shows the tile as ready each time the Quick Settings panel opens. */
  override fun onStartListening() {
    super.onStartListening()

    val tile = qsTile ?: return
    tile.state = Tile.STATE_INACTIVE
    tile.updateTile()
  }

  /** Starts the scan. If the device is locked, the user must unlock it first. */
  override fun onClick() {
    super.onClick()

    if (isLocked) {
      unlockAndRun { startScanAndCollapsePanel() }
    } else {
      startScanAndCollapsePanel()
    }
  }

  /** Starts the scan intent and closes the Quick Settings panel. */
  private fun startScanAndCollapsePanel() {
    val intent = createScanIntent().addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val flags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      startActivityAndCollapse(PendingIntent.getActivity(this, 0, intent, flags))
    } else {
      @Suppress("DEPRECATION", "StartActivityAndCollapseDeprecated")
      startActivityAndCollapse(intent)
    }
  }
}

/** Quick Settings tile that opens the app on the camera. */
class CameraScanTileService : ScanTileService() {
  /** @return The intent that opens the app on the camera. */
  override fun createScanIntent(): Intent = ScanDeepLinks.createCameraIntent(this)
}

/** Quick Settings tile that reads a QR code from the current screen. */
class ScreenScanTileService : ScanTileService() {
  /**
   * Creates the intent that starts the screen capture flow. The flag closes a
   * result sheet that the user left open. Without the flag, Android brings that
   * old sheet to the front and does not start a new scan.
   *
   * @return The intent for the screen capture activity.
   */
  override fun createScanIntent(): Intent {
    return Intent(this, ScreenCaptureActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
  }
}
