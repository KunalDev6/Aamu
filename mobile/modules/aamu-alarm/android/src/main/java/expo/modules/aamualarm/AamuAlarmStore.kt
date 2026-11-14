package expo.modules.aamualarm

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

internal data class Occurrence(
  val id: String, val kind: String, val scheduledAt: Long, val originalScheduledAt: Long,
  val localDate: String, val offsetMinutes: Int, var state: String = "scheduled",
) {
  fun json() = JSONObject().put("id", id).put("kind", kind).put("scheduledAt", scheduledAt)
    .put("originalScheduledAt", originalScheduledAt).put("localDate", localDate)
    .put("offsetMinutes", offsetMinutes).put("state", state)
  fun bridge(now: Long) = mapOf("id" to id, "kind" to kind,
    "state" to if (state == "scheduled" && scheduledAt < now) "unknown" else state,
    "scheduledAt" to AlarmCalendar.iso(scheduledAt), "originalScheduledAt" to AlarmCalendar.iso(originalScheduledAt),
    "localDate" to localDate, "offsetMinutes" to offsetMinutes)
  companion object {
    fun read(value: JSONObject) = Occurrence(value.getString("id"), value.getString("kind"),
      value.getLong("scheduledAt"), value.getLong("originalScheduledAt"), value.getString("localDate"),
      value.getInt("offsetMinutes"), value.getString("state"))
  }
}

internal data class AlarmState(
  var enabled: Boolean = false, var hour: Int? = null, var minute: Int? = null,
  var suppressedDay: String? = null, var askedPermission: Boolean = false, var sequence: Int = 0,
  val occurrences: MutableList<Occurrence> = mutableListOf(),
  val events: MutableList<JSONObject> = mutableListOf(),
) {
  fun append(type: String, source: String, occurrence: Occurrence, now: Long) {
    sequence += 1
    events += JSONObject().put("sequence", sequence).put("type", type).put("source", source)
      .put("occurredAt", AlarmCalendar.iso(now)).put("alarmId", occurrence.id)
      .put("originalScheduledAt", AlarmCalendar.iso(occurrence.originalScheduledAt))
      .put("localDate", occurrence.localDate).put("offsetMinutes", occurrence.offsetMinutes)
  }
}

/** Only alarm IDs, dates and interaction evidence; no personal identity, audio or goal text. */
internal class AamuAlarmStore(context: Context) {
  private val file = AtomicFile(File(context.noBackupFilesDir, "aamu/alarm-state.json"))
  fun read(): AlarmState {
    if (!file.baseFile.exists()) return AlarmState()
    val json = file.openRead().bufferedReader().use { JSONObject(it.readText()) }
    val state = AlarmState(json.getBoolean("enabled"),
      if (json.isNull("hour")) null else json.getInt("hour"),
      if (json.isNull("minute")) null else json.getInt("minute"),
      if (json.isNull("suppressedDay")) null else json.getString("suppressedDay"),
      json.optBoolean("askedPermission"), json.getInt("sequence"))
    val occurrences = json.getJSONArray("occurrences")
    for (i in 0 until occurrences.length()) state.occurrences += Occurrence.read(occurrences.getJSONObject(i))
    val events = json.getJSONArray("events")
    for (i in 0 until events.length()) state.events += events.getJSONObject(i)
    return state
  }
  fun write(state: AlarmState) {
    val json = JSONObject().put("enabled", state.enabled).put("hour", state.hour ?: JSONObject.NULL)
      .put("minute", state.minute ?: JSONObject.NULL).put("suppressedDay", state.suppressedDay ?: JSONObject.NULL)
      .put("askedPermission", state.askedPermission).put("sequence", state.sequence)
      .put("occurrences", JSONArray(state.occurrences.map { it.json() })).put("events", JSONArray(state.events))
    check(file.baseFile.parentFile?.isDirectory == true || file.baseFile.parentFile?.mkdirs() == true)
    val stream = file.startWrite()
    try { stream.write(json.toString().toByteArray(Charsets.UTF_8)); file.finishWrite(stream) }
    catch (error: Throwable) { file.failWrite(stream); throw error }
  }
}
