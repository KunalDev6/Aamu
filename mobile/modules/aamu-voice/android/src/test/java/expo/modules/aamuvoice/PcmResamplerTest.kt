package expo.modules.aamuvoice

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin
import kotlin.math.sqrt
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PcmResamplerTest {
  private fun signal(rate: Int, frequency: Double, amplitude: Double = 0.5) =
    FloatArray(rate * 5) { (amplitude * sin(2.0 * PI * frequency * it / rate)).toFloat() }

  private fun rms(samples: FloatArray, trim: Int = 160): Double = sqrt(
    (trim until samples.size - trim).sumOf { samples[it].toDouble() * samples[it] } /
      (samples.size - 2 * trim)
  )

  private fun invalid(block: () -> Unit) {
    try { block() } catch (_: IllegalArgumentException) { return }
    throw AssertionError("Invalid PCM was accepted.")
  }

  @Test fun standardRatesProduceExactlyFiveSeconds() {
    for (rate in listOf(8_000, 16_000, 44_100, 48_000, 96_000, 192_000)) {
      val result = PcmResampler.toMono16k(FloatArray(rate * 5), rate, 1)
      assertEquals("sample rate $rate", 80_000, result.size)
      assertTrue(result.all { it == 0f })
    }
  }

  @Test fun sixteenKilohertzDoesNotChangeSamplesOrMutateInput() {
    val input = signal(16_000, 311.0)
    val original = input.copyOf()
    val result = PcmResampler.toMono16k(input, 16_000, 1)
    assertArrayEquals(original, result, 0f)
    result[0] = 1f
    assertArrayEquals(original, input, 0f)
  }

  @Test fun mixesEveryChannelEquallyBeforeResampling() {
    val stereo = FloatArray(48_000 * 5 * 2) { if (it % 2 == 0) 0.75f else -0.25f }
    val result = PcmResampler.toMono16k(stereo, 48_000, 2)
    assertTrue(result.all { abs(it - 0.25f) < 0.000001f })
    val eightChannels = FloatArray(16_000 * 5 * 8) { if (it % 8 == 7) 0.8f else 0f }
    assertTrue(PcmResampler.toMono16k(eightChannels, 16_000, 8).all { abs(it - 0.1f) < 0.000001f })
  }

  @Test fun oppositeChannelsCancelWithoutBecomingSpeechEvidence() {
    val input = FloatArray(44_100 * 5 * 2) { if (it % 2 == 0) 0.5f else -0.5f }
    assertTrue(PcmResampler.toMono16k(input, 44_100, 2).all { it == 0f })
  }

  @Test fun constantsStayConstantAtBothWindowBoundaries() {
    for (rate in listOf(8_000, 44_100, 48_000, 16_001)) {
      val result = PcmResampler.toMono16k(FloatArray(rate * 5) { -0.6f }, rate, 1)
      assertTrue("constant at $rate", result.all { abs(it + 0.6f) < 0.000001f })
    }
  }

  @Test fun preservesSpeechBandFrequencyAndTiming() {
    for (rate in listOf(44_100, 48_000)) {
      val result = PcmResampler.toMono16k(signal(rate, 1_000.0), rate, 1)
      val expected = signal(16_000, 1_000.0)
      val error = FloatArray(result.size - 320) { result[it + 160] - expected[it + 160] }
      assertTrue("phase/amplitude at $rate", rms(error, 0) < 0.0001)
      val highSpeech = PcmResampler.toMono16k(signal(rate, 6_000.0), rate, 1)
      assertTrue("passband at $rate", rms(highSpeech) > 0.34)
    }
  }

  @Test fun suppressesAboveNyquistTonesInsteadOfAliasingThem() {
    for (rate in listOf(44_100, 48_000)) {
      val result = PcmResampler.toMono16k(signal(rate, 12_000.0), rate, 1)
      assertTrue("alias attenuation at $rate", rms(result) < 0.0002)
    }
  }

  @Test fun framesAfterFiveSecondsNeverAffectAnalysis() {
    val prefix = signal(44_100, 700.0)
    val longer = FloatArray(44_100 * 6) { if (it < prefix.size) prefix[it] else 1f }
    assertArrayEquals(
      PcmResampler.toMono16k(prefix, 44_100, 1),
      PcmResampler.toMono16k(longer, 44_100, 1),
      0f
    )
  }

  @Test fun unusualRateHasBoundedFiniteOutputAndPreservesDc() {
    val result = PcmResampler.toMono16k(FloatArray(191_999 * 5) { 0.2f }, 191_999, 1)
    assertEquals(80_000, result.size)
    assertFalse(result.any { !it.isFinite() })
    assertTrue(result.all { abs(it - 0.2f) < 0.000001f })
  }

  @Test fun rejectsInvalidRatesChannelsAndTruncatedFrames() {
    val valid = FloatArray(80_000)
    for (rate in listOf(0, -1, 7_999, 192_001, Int.MAX_VALUE)) invalid { PcmResampler.toMono16k(valid, rate, 1) }
    for (channels in listOf(0, -1, 9, Int.MAX_VALUE)) invalid { PcmResampler.toMono16k(valid, 16_000, channels) }
    invalid { PcmResampler.toMono16k(FloatArray(159_999), 16_000, 2) }
    invalid { PcmResampler.toMono16k(FloatArray(79_999), 16_000, 1) }
    invalid { PcmResampler.toMono16k(FloatArray(0), 16_000, 1) }
  }

  @Test fun rejectsNonFiniteAndOutOfRangeSamplesIncludingTrailingFrames() {
    for (sample in listOf(Float.NaN, Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY, 1.01f, -1.01f)) {
      val input = FloatArray(96_000)
      input[input.lastIndex] = sample
      invalid { PcmResampler.toMono16k(input, 16_000, 1) }
    }
  }
}
