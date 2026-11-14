package expo.modules.aamuvoice

import kotlin.math.PI
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/** Local signal conversion only. This helper makes no speech or loudness decision. */
internal object PcmResampler {
  const val TARGET_RATE = 16_000
  const val DURATION_SECONDS = 5
  const val TARGET_SAMPLES = TARGET_RATE * DURATION_SECONDS
  private const val MAX_PHASES = 1_024
  private const val FILTER_RADIUS = 32

  /**
   * Mix normalized interleaved PCM equally and return exactly the first five seconds at 16 kHz.
   * The decoder owns byte conversion and the six-second input cap. Incomplete, truncated or
   * non-finite PCM fails instead of becoming a successful silent sample. Frames after five
   * seconds are validated but never influence this analysis window.
   *
   * A Blackman-windowed sinc suppresses frequencies above the destination Nyquist limit.
   * The filter spans 32 input/output-limited sample periods per side with a 6% transition margin. Standard
   * sample rates use exact rational phases; unusual rates use at most 1,024 phases, bounding
   * memory and introducing at most half a phase of input-sample timing error. Boundary weights
   * are renormalized, preserving a constant signal without inventing zero-padded silence.
   */
  fun toMono16k(interleaved: FloatArray, sourceRate: Int, channels: Int): FloatArray {
    require(sourceRate in 8_000..192_000) { "Unsupported PCM sample rate." }
    require(channels in 1..8) { "Unsupported PCM channel count." }
    require(interleaved.size % channels == 0) { "PCM ends in an incomplete frame." }
    val sourceFrames = sourceRate * DURATION_SECONDS
    require(interleaved.size / channels >= sourceFrames) { "A complete five-second sample is required." }
    require(interleaved.all { it.isFinite() && it >= -1f && it <= 1f }) {
      "PCM must contain finite normalized samples."
    }

    val mono = FloatArray(sourceFrames) { frame ->
      var sum = 0.0
      for (channel in 0 until channels) sum += interleaved[frame * channels + channel]
      (sum / channels).toFloat()
    }
    if (sourceRate == TARGET_RATE) return mono

    val ratio = min(1.0, TARGET_RATE.toDouble() / sourceRate)
    val radius = ceil(FILTER_RADIUS / ratio).toInt()
    val cutoff = 0.5 * ratio * 0.94
    val divisor = gcd(sourceRate, TARGET_RATE)
    val exactPhaseCount = TARGET_RATE / divisor
    val phaseCount = min(exactPhaseCount, MAX_PHASES)
    val exactPhases = exactPhaseCount <= MAX_PHASES
    val kernels = Array(phaseCount) { phase ->
      val fraction = phase.toDouble() / phaseCount
      DoubleArray(2 * radius + 1) { index ->
        val distance = index - radius - fraction
        val windowPosition = distance / radius
        if (windowPosition <= -1.0 || windowPosition >= 1.0) 0.0 else {
          val window = 0.42 + 0.5 * cos(PI * windowPosition) + 0.08 * cos(2.0 * PI * windowPosition)
          val sinc = if (distance == 0.0) 2.0 * cutoff else sin(2.0 * PI * cutoff * distance) / (PI * distance)
          sinc * window
        }
      }
    }

    return FloatArray(TARGET_SAMPLES) { sample ->
      val position = sample.toLong() * sourceRate
      var center = (position / TARGET_RATE).toInt()
      val remainder = (position % TARGET_RATE).toInt()
      var phase = if (exactPhases) remainder / divisor
        else (remainder.toDouble() * phaseCount / TARGET_RATE).roundToInt()
      if (phase == phaseCount) { center += 1; phase = 0 }
      val kernel = kernels[phase]
      val from = maxOf(0, radius - center)
      val to = minOf(kernel.lastIndex, mono.lastIndex - center + radius)
      var weighted = 0.0
      var weightSum = 0.0
      for (index in from..to) {
        val weight = kernel[index]
        weighted += mono[center + index - radius] * weight
        weightSum += weight
      }
      (weighted / weightSum).toFloat()
    }
  }

  private fun gcd(first: Int, second: Int): Int {
    var a = first
    var b = second
    while (b != 0) { val remainder = a % b; a = b; b = remainder }
    return a
  }
}
