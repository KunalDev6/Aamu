package expo.modules.aamualarm

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/** Pure local-wall-clock scheduling; adding a calendar day is not adding 24 hours. */
internal object AlarmCalendar {
  // Match iOS's next-valid-time / first-repeated-time policy using API-24-safe
  // calendar primitives. Avoid silently moving a spring-gap 03:30 to 04:30.
  private fun wallTime(day: Calendar, hour: Int, minute: Int): Long {
    for (forward in 0..180) {
      val totalMinutes = hour * 60 + minute + forward
      val requested = (day.clone() as Calendar).apply {
        add(Calendar.DAY_OF_MONTH, totalMinutes / (24 * 60))
        isLenient = false
        set(Calendar.HOUR_OF_DAY, (totalMinutes / 60) % 24)
        set(Calendar.MINUTE, totalMinutes % 60)
      }
      val candidate = try { requested.timeInMillis } catch (_: IllegalArgumentException) { continue }
      var earliest = candidate
      for (backward in 1..180) {
        val earlier = (requested.clone() as Calendar).apply { timeInMillis = candidate - backward * 60_000L }
        if (earlier.get(Calendar.YEAR) == requested.get(Calendar.YEAR)
          && earlier.get(Calendar.DAY_OF_YEAR) == requested.get(Calendar.DAY_OF_YEAR)
          && earlier.get(Calendar.HOUR_OF_DAY) == requested.get(Calendar.HOUR_OF_DAY)
          && earlier.get(Calendar.MINUTE) == requested.get(Calendar.MINUTE)) earliest = earlier.timeInMillis
      }
      return earliest
    }
    throw IllegalStateException("The selected local alarm time could not be resolved.")
  }
  fun day(time: Long, zone: TimeZone = TimeZone.getDefault()): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = zone }.format(time)

  fun iso(time: Long): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    .apply { timeZone = TimeZone.getTimeZone("UTC") }.format(time)

  fun future(now: Long, hour: Int, minute: Int, suppressedDay: String?,
             zone: TimeZone = TimeZone.getDefault(), count: Int = 7): List<Long> {
    require(hour in 0..23 && minute in 0..59) { "Choose a valid alarm time." }
    require(count in 1..30)
    val dates = mutableListOf<Long>()
    val cursor = Calendar.getInstance(zone).apply {
      timeInMillis = now
      set(Calendar.HOUR_OF_DAY, 12); set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    repeat(count + 3) {
      if (dates.size < count) {
        val candidate = wallTime(cursor, hour, minute)
        if (candidate > now && day(candidate, zone) != suppressedDay && candidate !in dates) dates += candidate
        cursor.add(Calendar.DAY_OF_MONTH, 1)
      }
    }
    return dates
  }
}
