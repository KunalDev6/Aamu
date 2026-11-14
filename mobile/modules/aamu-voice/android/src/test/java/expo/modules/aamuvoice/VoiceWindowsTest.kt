package expo.modules.aamuvoice

import org.junit.Assert.*
import org.junit.Test

class VoiceWindowsTest {
  @Test fun silenceRequiresCompleteAnalysis() {
    val estimate = VoiceWindows.estimate(FloatArray(157), 0.5)
    assertEquals(0.0, estimate.share, 0.0)
    assertNull(estimate.onsetMs)
    assertThrows(IllegalArgumentException::class.java) { VoiceWindows.estimate(FloatArray(156), 0.5) }
  }
  @Test fun fullSpeechClipsFinalPadding() {
    val estimate = VoiceWindows.estimate(FloatArray(157) { 1f }, 0.5)
    assertEquals(1.0, estimate.share, 0.0)
    assertEquals(0.0, estimate.onsetMs!!, 0.0)
  }
  @Test fun thresholdIsInclusiveAndDoesNotSumProbabilities() {
    val frames = FloatArray(157)
    frames[10] = 0.5f; frames[11] = 0.99f; frames[12] = 0.499f
    val estimate = VoiceWindows.estimate(frames, 0.5)
    assertEquals(64.0 / 5000, estimate.share, 0.0)
    assertEquals(320.0, estimate.onsetMs!!, 0.0)
  }
  @Test fun onsetQuantizationSurroundsTheScoringBoundary() {
    val before = FloatArray(157).also { it[78] = 1f }
    val after = FloatArray(157).also { it[79] = 1f }
    assertEquals(2496.0, VoiceWindows.estimate(before, 0.5).onsetMs!!, 0.0)
    assertEquals(2528.0, VoiceWindows.estimate(after, 0.5).onsetMs!!, 0.0)
  }
  @Test fun lastFrameCountsOnlyEightMilliseconds() {
    val frames = FloatArray(157).also { it[156] = 1f }
    assertEquals(8.0 / 5000, VoiceWindows.estimate(frames, 0.5).share, 0.0)
  }
  @Test fun invalidOutputsFailInsteadOfSilent() {
    for (value in listOf(Float.NaN, Float.POSITIVE_INFINITY, -0.1f, 1.1f)) {
      assertThrows(IllegalArgumentException::class.java) { VoiceWindows.estimate(FloatArray(157).also { it[5] = value }, 0.5) }
    }
    assertThrows(IllegalArgumentException::class.java) { VoiceWindows.estimate(FloatArray(157), Double.NaN) }
  }
}
