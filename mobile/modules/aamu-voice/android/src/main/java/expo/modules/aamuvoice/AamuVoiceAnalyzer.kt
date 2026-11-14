package expo.modules.aamuvoice

import android.content.Context
import java.io.File
import java.net.URI
import java.security.MessageDigest

internal object AamuVoiceAnalyzer {
  const val CLASSIFIER = "silero.vad.v6.2.onnx"
  const val MODEL = "aamu-voice/silero-vad-v6.2.onnx"
  const val MODEL_SHA256 = "1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3"

  fun analyze(context: Context, uri: String, complete: Boolean, threshold: Double): Map<String, Any?> {
    if (!threshold.isFinite() || threshold !in 0.0..1.0) return result("failed", "invalid_config", 0.5)
    if (!complete) return result("failed", "incomplete_recording", threshold)
    val file = try { verifiedFile(context, uri) } catch (_: Exception) {
      return result("failed", "invalid_local_file", threshold)
    }
    var duration: Double? = null
    var stage = "analysis_failed"
    return try {
      val pcm = LocalAudioDecoder.decode(file)
      duration = pcm.durationMs
      if (duration < VoiceWindows.DURATION_MS) return result("failed", "too_short", threshold, duration)
      val samples = PcmResampler.toMono16k(pcm.samples, pcm.sampleRate, pcm.channels)
      stage = "classifier_unavailable"
      val model = context.assets.open(MODEL).use { it.readBytes() }
      check(MessageDigest.getInstance("SHA-256").digest(model).joinToString("") { "%02x".format(it) } == MODEL_SHA256)
      SileroVad(model).use { classifier ->
        stage = "analysis_failed"
        val estimate = VoiceWindows.estimate(classifier.analyze(samples), threshold)
        result(if (estimate.onsetMs == null) "silent" else "spoke", "none", threshold, duration, estimate)
      }
    } catch (_: Exception) { result("failed", stage, threshold, duration) }
      catch (_: LinkageError) { result("unavailable", "classifier_unavailable", threshold, duration) }
    // No exception, URI, sample, probability sequence or model state is logged or persisted.
  }

  private fun verifiedFile(context: Context, uri: String): File {
    val parsed = URI(uri)
    require(parsed.scheme == "file" && parsed.authority.isNullOrEmpty() && parsed.query == null && parsed.fragment == null)
    val file = File(parsed).canonicalFile
    val roots = listOf(context.cacheDir, context.filesDir, context.noBackupFilesDir).map { it.canonicalFile }
    require(roots.any { file.path.startsWith(it.path + File.separator) })
    require(file.isFile && file.length() in 1..16_000_000)
    return file
  }

  private fun result(status: String, reason: String, threshold: Double, duration: Double? = null,
    estimate: VoiceEstimate? = null): Map<String, Any?> = mapOf(
    "status" to status, "reason" to reason, "speechShare" to estimate?.share,
    "speechOnsetMs" to estimate?.onsetMs, "durationMs" to duration,
    "analyzedDurationMs" to if (estimate == null) 0 else 5000,
    "windowMs" to if (estimate == null) null else 32,
    "hopMs" to if (estimate == null) null else 32,
    "classifier" to CLASSIFIER, "confidenceThreshold" to threshold, "estimated" to true)
}
