package expo.modules.aamualarm

import org.junit.Assert.*
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class AlarmCalendarTest {
  private val helsinki = TimeZone.getTimeZone("Europe/Helsinki")
  private fun instant(value: String, zone: TimeZone = helsinki) = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US)
    .apply { timeZone = zone }.parse(value)!!.time
  private fun clock(value: Long, zone: TimeZone = helsinki) = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US)
    .apply { timeZone = zone }.format(value)

  @Test fun upcomingTodayIsIncludedButAnAlreadyReachedTimeIsNot() {
    val before = AlarmCalendar.future(instant("2026-11-14 07:14"), 7, 15, null, helsinki)
    assertEquals(7, before.size); assertEquals("2026-11-14 07:15", clock(before.first()))
    val due = AlarmCalendar.future(instant("2026-11-14 07:15"), 7, 15, null, helsinki)
    assertEquals("2026-11-15 07:15", clock(due.first()))
  }
  @Test fun earlyHoldSuppressesOnlyThatDateAndKeepsSevenFutureMornings() {
    val days = AlarmCalendar.future(instant("2026-11-14 05:00"), 7, 15, "2026-11-14", helsinki)
    assertEquals(7, days.size); assertEquals("2026-11-15 07:15", clock(days.first()))
    assertEquals("2026-11-21 07:15", clock(days.last()))
  }
  @Test fun springTransitionMaintainsWallTimeInsteadOfAddingTwentyFourHours() {
    val days = AlarmCalendar.future(instant("2026-03-28 00:00"), 7, 15, null, helsinki)
    assertEquals("2026-03-28 07:15", clock(days[0])); assertEquals("2026-03-29 07:15", clock(days[1]))
    assertEquals(23 * 3_600_000L, days[1] - days[0])
  }
  @Test fun autumnTransitionMaintainsWallTimeAndOffsetsAreLocal() {
    val days = AlarmCalendar.future(instant("2026-10-24 00:00"), 7, 15, null, helsinki)
    assertEquals("2026-10-25 07:15", clock(days[1])); assertEquals(25 * 3_600_000L, days[1] - days[0])
    assertEquals(180, helsinki.getOffset(days[0]) / 60_000); assertEquals(120, helsinki.getOffset(days[1]) / 60_000)
  }
  @Test fun timezoneChangeRecalculatesDatesAtTheSelectedLocalTime() {
    val now = instant("2026-11-14 08:00")
    val london = TimeZone.getTimeZone("Europe/London")
    assertEquals("2026-11-15 07:15", clock(AlarmCalendar.future(now, 7, 15, null, helsinki).first()))
    assertEquals("2026-11-14 07:15", clock(AlarmCalendar.future(now, 7, 15, null, london).first(), london))
  }
  @Test fun nonexistentTimeUsesNextValidMinuteAndRepeatedTimeUsesFirstOccurrence() {
    val spring = AlarmCalendar.future(instant("2026-03-29 00:00"), 3, 30, null, helsinki).first()
    assertEquals("2026-03-29 04:00", clock(spring))
    val autumn = AlarmCalendar.future(instant("2026-10-25 00:00"), 3, 30, null, helsinki).first()
    assertEquals("2026-10-25 03:30", clock(autumn)); assertEquals(180, helsinki.getOffset(autumn) / 60_000)
  }
  @Test fun calendarCrossesYearAndLeapBoundaries() {
    assertEquals("2027-01-01 00:00", clock(AlarmCalendar.future(instant("2026-12-31 23:59"), 0, 0, null, helsinki).first()))
    assertEquals("2028-02-29 07:15", clock(AlarmCalendar.future(instant("2028-02-28 08:00"), 7, 15, null, helsinki).first()))
  }
  @Test fun invalidTimesFailInsteadOfSchedulingAnotherTime() {
    for (time in listOf(-1 to 0, 24 to 0, 1 to -1, 1 to 60)) {
      assertThrows(IllegalArgumentException::class.java) { AlarmCalendar.future(0, time.first, time.second, null, helsinki) }
    }
  }
}
