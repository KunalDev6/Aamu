package expo.modules.aamuvoice

internal data class VoiceEstimate(val share: Double, val onsetMs: Double?)

/** Silero emits one probability per 512 samples at 16 kHz: disjoint 32 ms windows. */
internal object VoiceWindows {
  const val SAMPLES = 80_000
  const val FRAME = 512
  const val WINDOW_MS = 32.0
  const val DURATION_MS = 5000.0
  const val FRAMES = (SAMPLES + FRAME - 1) / FRAME

  fun estimate(probabilities: FloatArray, threshold: Double): VoiceEstimate {
    require(threshold.isFinite() && threshold in 0.0..1.0)
    require(probabilities.size == FRAMES) { "Incomplete analysis" }
    var covered = 0.0
    var onset: Double? = null
    probabilities.forEachIndexed { index, probability ->
      require(probability.isFinite() && probability in 0f..1f)
      if (probability >= threshold) {
        val start = index * WINDOW_MS
        val end = minOf(start + WINDOW_MS, DURATION_MS)
        if (onset == null) onset = start
        covered += end - start // These windows never overlap; final padding is excluded.
      }
    }
    return VoiceEstimate(covered / DURATION_MS, onset)
  }
}
