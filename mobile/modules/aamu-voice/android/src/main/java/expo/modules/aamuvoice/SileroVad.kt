package expo.modules.aamuvoice

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtLoggingLevel
import ai.onnxruntime.OrtSession
import java.nio.FloatBuffer
import java.nio.LongBuffer

/** Official v6.2 ONNX contract: 64 context samples, 512 new samples, recurrent [2,1,128]. */
internal class SileroVad(model: ByteArray) : AutoCloseable {
  private val environment = OrtEnvironment.getEnvironment(OrtLoggingLevel.ORT_LOGGING_LEVEL_FATAL)
  private val session: OrtSession

  init {
    // This process uses no telemetry provider. Explicitly disable ORT telemetry as well.
    environment.setTelemetry(false)
    session = OrtSession.SessionOptions().use { options ->
      options.setInterOpNumThreads(1)
      options.setIntraOpNumThreads(1)
      options.setSessionLogLevel(OrtLoggingLevel.ORT_LOGGING_LEVEL_FATAL)
      environment.createSession(model, options)
    }
    check(session.inputNames == setOf("input", "state", "sr"))
    check(session.outputNames.containsAll(setOf("output", "stateN")))
  }

  fun analyze(samples: FloatArray): FloatArray {
    require(samples.size == VoiceWindows.SAMPLES && samples.all { it.isFinite() })
    // Each recording starts fresh: no recurrent state or audio survives the call.
    var state = FloatArray(256)
    val context = FloatArray(64)
    return FloatArray(VoiceWindows.FRAMES) { frameIndex ->
      val input = FloatArray(576)
      context.copyInto(input)
      val offset = frameIndex * VoiceWindows.FRAME
      samples.copyInto(input, 64, offset, minOf(offset + VoiceWindows.FRAME, samples.size))
      input.copyInto(context, 0, input.size - context.size)
      OnnxTensor.createTensor(environment, FloatBuffer.wrap(input), longArrayOf(1, 576)).use { audio ->
        OnnxTensor.createTensor(environment, FloatBuffer.wrap(state), longArrayOf(2, 1, 128)).use { hidden ->
          OnnxTensor.createTensor(environment, LongBuffer.wrap(longArrayOf(16_000)), longArrayOf()).use { rate ->
            session.run(mapOf("input" to audio, "state" to hidden, "sr" to rate)).use { outputs ->
              val probability = (outputs.get("output").get() as OnnxTensor).floatBuffer.get()
              val next = (outputs.get("stateN").get() as OnnxTensor).floatBuffer
              check(next.remaining() == state.size)
              state = FloatArray(state.size).also { next.get(it) }
              check(state.all { it.isFinite() })
              probability
            }
          }
        }
      }
    }
  }

  override fun close() { session.close() }
}
