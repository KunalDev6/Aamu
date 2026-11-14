package expo.modules.aamualarm

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AamuAlarmModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private var pending: Promise? = null
  private var awaitingSettings: String? = null
  private val main = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("AamuAlarm")
    AsyncFunction("getAuthorization") { AamuAlarmCoordinator.authorization(context) }
    AsyncFunction("requestAuthorization") { promise: Promise ->
      if (pending != null) { promise.reject("E_ALARM_PERMISSION_BUSY", "Alarm permission is already being requested.", null); return@AsyncFunction }
      pending = promise
      try {
        AamuAlarmCoordinator.askedPermission(context)
        AamuAlarmCoordinator.ensureChannel(context)
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
          val permissions = appContext.permissions ?: throw IllegalStateException("Notification permissions are unavailable.")
          permissions.askForPermissions({ main.post { advancePermission() } }, Manifest.permission.POST_NOTIFICATIONS)
        } else advancePermission()
      } catch (_: Exception) { finishPermission("denied") }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("scheduleDaily") { hour: Int, minute: Int -> AamuAlarmCoordinator.scheduleDaily(context, hour, minute) }
    AsyncFunction("scheduleSnooze") { seconds: Int -> AamuAlarmCoordinator.snooze(context, seconds) }
    AsyncFunction("stopCurrentOccurrence") { AamuAlarmCoordinator.stopCurrent(context) }
    AsyncFunction("cancelToday") { AamuAlarmCoordinator.cancelToday(context) }
    AsyncFunction("cancelAll") { AamuAlarmCoordinator.cancelAll(context) }
    AsyncFunction("rescheduleNext") { AamuAlarmCoordinator.reconcile(context) }
    AsyncFunction("getAlarms") { AamuAlarmCoordinator.snapshot(context) }
    AsyncFunction("getEvents") { afterSequence: Int -> AamuAlarmCoordinator.events(context, afterSequence) }
    OnActivityEntersForeground {
      try { AamuAlarmCoordinator.becameActive(context) } catch (_: Exception) { }
      if (pending != null && awaitingSettings != null) {
        try {
          val stage = awaitingSettings; awaitingSettings = null
          val allowed = when (stage) {
            "exact" -> AamuAlarmCoordinator.exactAllowed(context)
            "fullScreen" -> AamuAlarmCoordinator.fullScreenAllowed(context)
            else -> AamuAlarmCoordinator.notificationsAllowed(context)
          }
          if (allowed) advancePermission() else finishPermission("denied")
        } catch (_: Exception) {
          finishPermission("unavailable")
        }
      }
    }
    OnDestroy { finishPermission("unavailable") }
  }

  private fun finishPermission(value: String) {
    val promise = pending; pending = null; awaitingSettings = null; promise?.resolve(value)
  }
  private fun advancePermission() {
    if (pending == null) return
    try {
      if (!AamuAlarmCoordinator.notificationsAllowed(context)) {
        // A declined runtime prompt is a real denial, never silently bypassed.
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
          finishPermission("denied"); return
        }
        val intent = if (Build.VERSION.SDK_INT >= 26) Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName).putExtra(Settings.EXTRA_CHANNEL_ID, AamuAlarmCoordinator.CHANNEL)
        else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
        openSettings("notifications", intent); return
      }
      if (Build.VERSION.SDK_INT >= 31 && !AamuAlarmCoordinator.exactAllowed(context)) {
        openSettings("exact", Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))); return
      }
      if (Build.VERSION.SDK_INT >= 34 && !AamuAlarmCoordinator.fullScreenAllowed(context)) {
        openSettings("fullScreen", Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))); return
      }
      finishPermission(AamuAlarmCoordinator.authorization(context))
    } catch (_: Exception) { finishPermission("denied") }
  }
  private fun openSettings(stage: String, intent: Intent) {
    val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
    awaitingSettings = stage; activity.startActivity(intent)
  }
}
