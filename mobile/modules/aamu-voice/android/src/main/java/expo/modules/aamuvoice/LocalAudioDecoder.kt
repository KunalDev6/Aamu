package expo.modules.aamuvoice

import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.os.SystemClock
import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

internal data class DecodedPcm(val samples: FloatArray, val sampleRate: Int, val channels: Int) {
  val durationMs: Double get() = samples.size.toDouble() / channels / sampleRate * 1000
}

/** Decode a verified app-local file with Android codecs. No URL, stream or content-provider input. */
internal object LocalAudioDecoder {
  fun decode(file: File): DecodedPcm {
    val extractor = MediaExtractor()
    var decoder: MediaCodec? = null
    var started = false
    try {
      FileInputStream(file).use { extractor.setDataSource(it.fd) }
      val tracks = (0 until extractor.trackCount).filter {
        extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
      }
      require(tracks.size == 1)
      val track = tracks.single()
      val format = extractor.getTrackFormat(track)
      extractor.selectTrack(track)
      var rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      var encoding = AudioFormat.ENCODING_PCM_16BIT
      val chunks = mutableListOf<FloatArray>()
      var total = 0
      fun append(bytes: ByteBuffer) {
        require(rate in 8000..192000 && channels in 1..8)
        val width = when (encoding) {
          AudioFormat.ENCODING_PCM_16BIT -> 2
          AudioFormat.ENCODING_PCM_FLOAT -> 4
          else -> error("Unsupported PCM")
        }
        require(bytes.remaining() % (width * channels) == 0)
        bytes.order(ByteOrder.LITTLE_ENDIAN)
        val count = bytes.remaining() / width
        // The caller records five seconds. Bound malformed input without keeping audio on disk.
        require(total + count <= minOf(rate * channels * 6, 2_500_000))
        val chunk = FloatArray(count) {
          val value = if (width == 2) bytes.short / 32768f else bytes.float
          require(value.isFinite())
          value.coerceIn(-1f, 1f)
        }
        chunks += chunk; total += count
      }
      if (format.getString(MediaFormat.KEY_MIME) == "audio/raw") {
        if (format.containsKey(MediaFormat.KEY_PCM_ENCODING)) encoding = format.getInteger(MediaFormat.KEY_PCM_ENCODING)
        val buffer = ByteBuffer.allocate(262144)
        while (true) {
          buffer.clear()
          val count = extractor.readSampleData(buffer, 0)
          if (count < 0) break
          buffer.position(0); buffer.limit(count); append(buffer)
          extractor.advance()
        }
      } else {
        decoder = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
        decoder.configure(format, null, null, 0)
        decoder.start(); started = true
        val info = MediaCodec.BufferInfo()
        var inputEnded = false
        var outputEnded = false
        val deadline = SystemClock.elapsedRealtime() + 20_000
        while (!outputEnded) {
          check(SystemClock.elapsedRealtime() < deadline)
          if (!inputEnded) {
            val index = decoder.dequeueInputBuffer(10_000)
            if (index >= 0) {
              val buffer = decoder.getInputBuffer(index)!!
              buffer.clear()
              val count = extractor.readSampleData(buffer, 0)
              if (count < 0) {
                decoder.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                inputEnded = true
              } else {
                decoder.queueInputBuffer(index, 0, count, extractor.sampleTime, 0)
                extractor.advance()
              }
            }
          }
          when (val index = decoder.dequeueOutputBuffer(info, 10_000)) {
            MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
              val output = decoder.outputFormat
              val nextRate = output.getInteger(MediaFormat.KEY_SAMPLE_RATE)
              val nextChannels = output.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
              check(total == 0 || (nextRate == rate && nextChannels == channels))
              rate = nextRate; channels = nextChannels
              encoding = if (output.containsKey(MediaFormat.KEY_PCM_ENCODING)) output.getInteger(MediaFormat.KEY_PCM_ENCODING)
                else AudioFormat.ENCODING_PCM_16BIT
            }
            else -> if (index >= 0) {
              try {
                if (info.size > 0 && info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG == 0) {
                  val output = decoder.getOutputBuffer(index)!!
                  output.position(info.offset); output.limit(info.offset + info.size)
                  append(output.slice())
                }
                outputEnded = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
              } finally { decoder.releaseOutputBuffer(index, false) }
            }
          }
        }
      }
      require(total > 0)
      val samples = FloatArray(total)
      var position = 0
      chunks.forEach { it.copyInto(samples, position); position += it.size }
      return DecodedPcm(samples, rate, channels)
    } finally {
      if (started) try { decoder?.stop() } catch (_: Exception) { }
      decoder?.release()
      extractor.release()
    }
  }
}
