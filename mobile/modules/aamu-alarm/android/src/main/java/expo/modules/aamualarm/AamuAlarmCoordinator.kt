package expo.modules.aamualarm

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import java.util.TimeZone
import java.util.UUID

internal object AamuAlarmCoordinator {
  const val CHANNEL = "aamu_native_alarm_v1"
  const val FIRE = "expo.modules.aamualarm.FIRE"
  const val STOP = "expo.modules.aamualarm.STOP"
  const val SNOOZE = "expo.modules.aamualarm.SNOOZE"
  const val ID = "alarmId"
  private val lock = Any()

  private fun alarms(context: Context) = context.getSystemService(AlarmManager::class.java)
  private fun notifications(context: Context) = context.getSystemService(NotificationManager::class.java)
  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL, "Aamu alarms", NotificationManager.IMPORTANCE_HIGH)
      // The foreground service owns one alarm audio stream. Never double-play a notification sound.
      channel.setSound(null, null); channel.enableVibration(false)
      channel.description = "Your daily Aamu alarm"
      notifications(context).createNotificationChannel(channel)
    }
  }
  fun notificationsAllowed(context: Context): Boolean {
    ensureChannel(context)
    val runtime = Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    return runtime && notifications(context).areNotificationsEnabled()
      && (Build.VERSION.SDK_INT < 26 || (notifications(context).getNotificationChannel(CHANNEL)?.importance ?: 0) >= NotificationManager.IMPORTANCE_HIGH)
  }
  fun exactAllowed(context: Context) = Build.VERSION.SDK_INT < 31 || alarms(context).canScheduleExactAlarms()
  fun fullScreenAllowed(context: Context) = Build.VERSION.SDK_INT < 34 || notifications(context).canUseFullScreenIntent()
  fun authorized(context: Context) = notificationsAllowed(context) && exactAllowed(context) && fullScreenAllowed(context)
  fun authorization(context: Context): String = synchronized(lock) {
    if (authorized(context)) "authorized" else if (AamuAlarmStore(context).read().askedPermission) "denied" else "notDetermined"
  }
  fun askedPermission(context: Context) = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read(); state.askedPermission = true; store.write(state)
  }

  fun action(context: Context, action: String, id: String): PendingIntent = PendingIntent.getBroadcast(context, 0,
    Intent(context, AamuAlarmReceiver::class.java).setAction(action)
      .setData(Uri.parse("aamu-alarm://$id/$action")).putExtra(ID, id),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

  fun openApp(context: Context): Intent = (context.packageManager.getLaunchIntentForPackage(context.packageName)
    ?: throw IllegalStateException("Aamu could not be opened.")).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
  }
  fun activityIntent(context: Context, id: String) = PendingIntent.getActivity(context, 0,
    Intent(context, AamuAlarmActivity::class.java).setData(Uri.parse("aamu-alarm://$id/show"))
      .putExtra(ID, id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  private fun schedule(context: Context, occurrence: Occurrence) {
    val show = PendingIntent.getActivity(context, 0, openApp(context), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    alarms(context).setAlarmClock(AlarmManager.AlarmClockInfo(occurrence.scheduledAt, show), action(context, FIRE, occurrence.id))
  }
  private fun cancel(context: Context, occurrence: Occurrence) {
    val pending = action(context, FIRE, occurrence.id)
    alarms(context).cancel(pending); pending.cancel(); occurrence.state = "ended"
  }

  /** Reconcile seven fixed future occurrences, replenished by each actual native fire. */
  private fun replenish(context: Context, state: AlarmState, now: Long) {
    if (!state.enabled) return
    check(authorized(context)) { "Alarm permission is required." }
    val wanted = AlarmCalendar.future(now, state.hour ?: return, state.minute ?: return, state.suppressedDay)
    val keep = mutableSetOf<String>()
    val created = mutableListOf<Occurrence>()
    try {
      for (date in wanted) {
        val occurrence = state.occurrences.find { it.kind == "daily" && it.state == "scheduled" && it.scheduledAt == date }
          ?: Occurrence(UUID.randomUUID().toString(), "daily", date, date, AlarmCalendar.day(date),
            TimeZone.getDefault().getOffset(date) / 60_000).also { created += it }
        schedule(context, occurrence); keep += occurrence.id
      }
    } catch (error: Throwable) {
      for (occurrence in created) cancel(context, occurrence)
      throw error
    }
    for (old in state.occurrences.filter { it.kind == "daily" && it.state == "scheduled" && it.scheduledAt > now && it.id !in keep }) cancel(context, old)
    state.occurrences += created
  }
  private fun snapshot(state: AlarmState, now: Long): Map<String, Any?> {
    val visible = state.occurrences.filter { it.state != "ended" }.sortedBy { it.scheduledAt }
    return mapOf("enabled" to state.enabled, "hour" to state.hour, "minute" to state.minute,
      "horizonEnd" to visible.lastOrNull { it.kind == "daily" }?.let { AlarmCalendar.iso(it.scheduledAt) },
      "alarms" to visible.map { it.bridge(now) })
  }
  fun snapshot(context: Context): Map<String, Any?> = synchronized(lock) { snapshot(AamuAlarmStore(context).read(), System.currentTimeMillis()) }
  fun scheduleDaily(context: Context, hour: Int, minute: Int): Map<String, Any?> = synchronized(lock) {
    require(hour in 0..23 && minute in 0..59) { "Choose a valid alarm time." }
    check(authorized(context)) { "Alarm permission is required." }
    val store = AamuAlarmStore(context); val state = store.read(); val now = System.currentTimeMillis()
    state.enabled = true; state.hour = hour; state.minute = minute
    replenish(context, state, now); store.write(state); snapshot(state, now)
  }
  fun reconcile(context: Context): Map<String, Any?> = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read(); val now = System.currentTimeMillis()
    replenish(context, state, now)
    // A reboot removes native one-shots. Restore an outstanding future snooze too.
    for (snooze in state.occurrences.filter { it.kind == "snooze" && it.state == "scheduled" && it.scheduledAt > now }) {
      if (state.enabled && authorized(context)) schedule(context, snooze)
    }
    store.write(state); snapshot(state, now)
  }
  private fun current(state: AlarmState, now: Long) = state.occurrences
    .filter { it.originalScheduledAt <= now }
    .maxByOrNull { it.originalScheduledAt }
  private fun stopDue(context: Context, state: AlarmState, now: Long) {
    for (occurrence in state.occurrences.filter { it.state == "alerting" ||
      (it.localDate == AlarmCalendar.day(now) && it.originalScheduledAt <= now && it.state != "ended") }) cancel(context, occurrence)
    context.stopService(Intent(context, AamuAlarmService::class.java))
  }
  fun stopCurrent(context: Context): Map<String, Any?> = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read(); val now = System.currentTimeMillis()
    stopDue(context, state, now); store.write(state); snapshot(state, now) // No fabricated user Stop.
  }
  fun cancelToday(context: Context): Map<String, Any?> = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read(); val now = System.currentTimeMillis()
    state.suppressedDay = AlarmCalendar.day(now)
    store.write(state) // A failed future refill must never undo an early hold.
    for (occurrence in state.occurrences.filter { it.localDate == state.suppressedDay && it.state != "ended" }) cancel(context, occurrence)
    context.stopService(Intent(context, AamuAlarmService::class.java))
    store.write(state); replenish(context, state, now); store.write(state); snapshot(state, now)
  }
  fun cancelAll(context: Context): Map<String, Any?> = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read(); state.enabled = false
    store.write(state) // Any already-dispatched receiver now sees disabled.
    for (occurrence in state.occurrences.filter { it.state != "ended" }) cancel(context, occurrence)
    store.write(state); context.stopService(Intent(context, AamuAlarmService::class.java))
    snapshot(state, System.currentTimeMillis())
  }
  fun snooze(context: Context, seconds: Int, source: String = "app", expectedId: String? = null): Map<String, Any?> = synchronized(lock) {
    require(seconds == 300) { "Aamu snoozes last five minutes." }
    check(authorized(context)) { "Alarm permission is required." }
    val store = AamuAlarmStore(context); val state = store.read(); val now = System.currentTimeMillis()
    check(state.enabled) { "The alarm is off." }
    if (expectedId != null && state.occurrences.none { it.id == expectedId && it.state == "alerting" }) return@synchronized snapshot(state, now)
    val morning = (if (expectedId != null) state.occurrences.find { it.id == expectedId } else current(state, now))
      ?: throw IllegalStateException("There is no current morning to snooze.")
    val next = Occurrence(UUID.randomUUID().toString(), "snooze", now + 300_000,
      morning.originalScheduledAt, morning.localDate, morning.offsetMinutes)
    schedule(context, next)
    stopDue(context, state, now); state.occurrences += next
    state.append("snooze", source, next, now); store.write(state); snapshot(state, now)
  }
  fun systemStop(context: Context, id: String) = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read(); val now = System.currentTimeMillis()
    val occurrence = state.occurrences.find { it.id == id && it.state == "alerting" } ?: return@synchronized
    state.append("stop", "system_intent", occurrence, now)
    stopDue(context, state, now); store.write(state)
  }
  fun fire(context: Context, id: String): Boolean = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read(); val now = System.currentTimeMillis()
    val occurrence = state.occurrences.find { it.id == id && it.state == "scheduled" } ?: return@synchronized false
    if (!state.enabled || !authorized(context) || occurrence.localDate == state.suppressedDay) return@synchronized false
    // A pending intent cannot claim an early ring, or revive an already consumed occurrence.
    if (occurrence.scheduledAt > now + 1_000) return@synchronized false
    occurrence.state = "alerting"; store.write(state)
    // Failure to replenish must not prevent this observed alarm from ringing.
    try { replenish(context, state, now); store.write(state) } catch (_: Exception) { }
    true
  }
  fun recordRinging(context: Context, id: String) = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read()
    val occurrence = state.occurrences.find { it.id == id && it.state == "alerting" } ?: return@synchronized
    if (state.events.none { it.getString("type") == "ring" && it.getString("alarmId") == id }) {
      state.append("ring", "native_observer", occurrence, System.currentTimeMillis()); store.write(state)
    }
  }
  fun isAlerting(context: Context, id: String): Boolean = synchronized(lock) {
    AamuAlarmStore(context).read().occurrences.any { it.id == id && it.state == "alerting" }
  }
  fun becameActive(context: Context) = synchronized(lock) {
    val store = AamuAlarmStore(context); val state = store.read(); val now = System.currentTimeMillis()
    current(state, now)?.takeIf { now - it.originalScheduledAt < 3_600_000 }?.let {
      state.append("app_open", "app", it, now); store.write(state)
    }
  }
  fun events(context: Context, after: Int): List<Map<String, Any?>> = synchronized(lock) {
    AamuAlarmStore(context).read().events.filter { it.getInt("sequence") > after }.map { event ->
      event.keys().asSequence().associateWith { key -> event.get(key).takeUnless { it == org.json.JSONObject.NULL } }
    }
  }
}
