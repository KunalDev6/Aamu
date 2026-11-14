import ActivityKit
import AlarmKit
import SwiftUI
import WidgetKit

@main
struct AamuAlarmWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: AlarmAttributes<AamuAlarmMetadata>.self) { context in
      HStack {
        Image(systemName: "sunrise")
        Text("Aamu").font(.system(size: 18, weight: .medium))
        Spacer()
        countdown(context.state).font(.system(size: 24, weight: .medium)).monospacedDigit()
      }
      .padding(20)
      .activitySystemActionForegroundColor(.primary)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label("Aamu", systemImage: "sunrise").font(.system(size: 16))
        }
        DynamicIslandExpandedRegion(.trailing) {
          countdown(context.state).font(.system(size: 20)).monospacedDigit()
        }
      } compactLeading: {
        Image(systemName: "sunrise")
      } compactTrailing: {
        countdown(context.state).monospacedDigit().frame(maxWidth: 48)
      } minimal: {
        Image(systemName: "sunrise")
      }
    }
  }

  @ViewBuilder
  private func countdown(_ state: AlarmPresentationState) -> some View {
    switch state.mode {
    case .countdown(let countdown):
      Text(timerInterval: countdown.startDate...countdown.fireDate, countsDown: true)
    case .paused: Text("Paused")
    case .alert: Text("Aamu")
    @unknown default: Text("Aamu")
    }
  }
}
