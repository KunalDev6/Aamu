package expo.modules.aamuvoice

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AamuVoiceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AamuVoice")
    // Expo AsyncFunction executes on its worker queue; never decode/infer on the UI thread.
    AsyncFunction("analyzeRecording") { uri: String, complete: Boolean, threshold: Double ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      AamuVoiceAnalyzer.analyze(context, uri, complete, threshold)
    }
  }
}
