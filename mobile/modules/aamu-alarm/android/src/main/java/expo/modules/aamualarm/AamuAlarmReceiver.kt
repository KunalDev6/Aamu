package expo.modules.aamualarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/** Explicit, non-exported PendingIntents; alarm work survives a closed JS process. */
class AamuAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(AamuAlarmCoordinator.ID) ?: return
    try {
      when (intent.action) {
        AamuAlarmCoordinator.FIRE -> if (AamuAlarmCoordinator.fire(context, id)) {
          val service = Intent(context, AamuAlarmService::class.java).putExtra(AamuAlarmCoordinator.ID, id)
          if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service) else context.startService(service)
        }
        AamuAlarmCoordinator.STOP -> AamuAlarmCoordinator.systemStop(context, id)
        AamuAlarmCoordinator.SNOOZE -> AamuAlarmCoordinator.snooze(context, 300, "system_intent", id)
      }
    } catch (_: Exception) {
      // No invented interaction, external report, or private exception logging.
      // A denied scheduler must not be treated as a successful snooze by the UI.
    }
  }
}

class AamuAlarmRestoreReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action !in setOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED,
        Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED,
        "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED")) return
    try { AamuAlarmCoordinator.reconcile(context) } catch (_: Exception) { }
  }
}
