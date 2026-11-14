package expo.modules.aamuvoice

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.os.SystemClock
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.After
import org.junit.Test
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Public upstream speech + generated silence only. Never access microphone or app user data. */
class VoiceAnalyzerTest {
  private val instrumentation get() = InstrumentationRegistry.getInstrumentation()
  private val context get() = instrumentation.targetContext
  private val files = mutableListOf<File>()
  @After fun tearDown() { files.forEach { it.delete() } }

  private fun file(bytes: ByteArray, suffix: String = ".wav"): File =
    File.createTempFile("aamu-vad-fixture-", suffix, context.cacheDir).also { it.writeBytes(bytes); files += it }

  private fun wav(samples: ShortArray, rate: Int = 16000): ByteArray {
    val pcmBytes = samples.size * 2
    return ByteBuffer.allocate(44 + pcmBytes).order(ByteOrder.LITTLE_ENDIAN).apply {
      put("RIFF".toByteArray()); putInt(36 + pcmBytes); put("WAVEfmt ".toByteArray())
      putInt(16); putShort(1); putShort(1); putInt(rate); putInt(rate * 2); putShort(2); putShort(16)
      put("data".toByteArray()); putInt(pcmBytes); samples.forEach { putShort(it) }
    }.array()
  }
  private fun analyze(input: File, complete: Boolean = true, threshold: Double = 0.5) =
    AamuVoiceAnalyzer.analyze(context, input.toURI().toString(), complete, threshold)

  @Test fun testCompleteSilenceRunsRealDecoderAndBundledModel() {
    val result = analyze(file(wav(ShortArray(80_000))))
    assertEquals("silent", result["status"])
    assertEquals(0.0, result["speechShare"])
    assertNull(result["speechOnsetMs"])
    assertEquals(5000, result["analyzedDurationMs"])
    assertEquals(AamuVoiceAnalyzer.CLASSIFIER, result["classifier"])
  }
  @Test fun testAndroidAacRecordingContainerDecodesCompletely() {
    val output = file(ByteArray(0), ".m4a")
    val encoder = MediaCodec.createEncoderByType("audio/mp4a-latm")
    val muxer = MediaMuxer(output.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    var muxerStarted = false
    var encoderStarted = false
    try {
      val format = MediaFormat.createAudioFormat("audio/mp4a-latm", 16000, 1).apply {
        setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
        setInteger(MediaFormat.KEY_BIT_RATE, 64000)
      }
      encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
      encoder.start(); encoderStarted = true
      var queued = 0
      var inputEnded = false
      var outputEnded = false
      var track = -1
      val info = MediaCodec.BufferInfo()
      val deadline = SystemClock.elapsedRealtime() + 20_000
      while (!outputEnded) {
        check(SystemClock.elapsedRealtime() < deadline)
        if (!inputEnded) {
          val index = encoder.dequeueInputBuffer(10_000)
          if (index >= 0) {
            val buffer = encoder.getInputBuffer(index)!!
            buffer.clear()
            val count = minOf(buffer.remaining() / 2, 80_000 - queued)
            repeat(count) { buffer.putShort(0) }
            val flags = if (count == 0) MediaCodec.BUFFER_FLAG_END_OF_STREAM else 0
            encoder.queueInputBuffer(index, 0, count * 2, queued.toLong() * 1_000_000 / 16000, flags)
            queued += count; inputEnded = count == 0
          }
        }
        when (val index = encoder.dequeueOutputBuffer(info, 10_000)) {
          MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            track = muxer.addTrack(encoder.outputFormat); muxer.start(); muxerStarted = true
          }
          else -> if (index >= 0) {
            try {
              if (info.size > 0 && info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG == 0) {
                check(muxerStarted)
                muxer.writeSampleData(track, encoder.getOutputBuffer(index)!!, info)
              }
              outputEnded = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
            } finally { encoder.releaseOutputBuffer(index, false) }
          }
        }
      }
    } finally {
      if (encoderStarted) encoder.stop()
      encoder.release()
      if (muxerStarted) muxer.stop()
      muxer.release()
    }
    val result = analyze(output)
    assertEquals("silent", result["status"])
    assertEquals(0.0, result["speechShare"])
    assertTrue((result["durationMs"] as Double) >= 5000)
  }
  @Test fun testSpeechAndDelayedOnsetUseActualModel() {
    val bytes = instrumentation.context.assets.open("upstream-speech-5s.wav").use { it.readBytes() }
    val source = file(bytes)
    val result = analyze(source)
    assertEquals("spoke", result["status"])
    assertTrue((result["speechShare"] as Double) > 0)
    val decoded = LocalAudioDecoder.decode(source)
    val mono = PcmResampler.toMono16k(decoded.samples, decoded.sampleRate, decoded.channels)
    val delayed = ShortArray(80_000)
    // 2560ms exact frame boundary, followed by the first 2440ms of upstream speech.
    for (i in 0 until 39040) delayed[40960 + i] = (mono[i] * 32767).toInt().toShort()
    val delayedResult = analyze(file(wav(delayed)))
    assertEquals("spoke", delayedResult["status"])
    assertTrue((delayedResult["speechOnsetMs"] as Double) >= 2560)
    assertTrue((delayedResult["speechOnsetMs"] as Double) < 5000)
    assertTrue((delayedResult["speechShare"] as Double) <= 0.488)
  }
  @Test fun testIncompleteAndShortNeverBecomeSilent() {
    val full = file(wav(ShortArray(80_000)))
    val incomplete = analyze(full, false)
    assertEquals("failed", incomplete["status"])
    assertEquals("incomplete_recording", incomplete["reason"])
    assertNull(incomplete["speechShare"])
    val short = analyze(file(wav(ShortArray(79_999))))
    assertEquals("failed", short["status"])
    assertEquals("too_short", short["reason"])
    assertNull(short["speechShare"])
  }
  @Test fun testInvalidAndRemoteFilesNeverAnalyze() {
    val remote = AamuVoiceAnalyzer.analyze(context, "https://example.invalid/audio.wav", true, 0.5)
    assertEquals("invalid_local_file", remote["reason"])
    val malformed = analyze(file(byteArrayOf(1, 2, 3)))
    assertEquals("failed", malformed["status"])
    assertNull(malformed["speechShare"])
    assertEquals("invalid_config", analyze(file(wav(ShortArray(80_000))), true, Double.NaN)["reason"])
  }
}
