package expo.modules.aamualarm

import android.app.Activity
import android.content.Intent
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Date

/** Native locked-screen controls only; no personal message, sensing or step text. */
class AamuAlarmActivity : Activity() {
  private val handler = Handler(Looper.getMainLooper())
  private var alarmId: String? = null
  private val monitor = object : Runnable {
    override fun run() {
      val id = alarmId
      if (id == null || !AamuAlarmCoordinator.isAlerting(this@AamuAlarmActivity, id)) finish()
      else handler.postDelayed(this, 500)
    }
  }
  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
  private fun color(id: Int) = resources.getColor(id, theme)
  private val font by lazy { Typeface.createFromAsset(assets, "plus-jakarta-sans.ttf") }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
    else { @Suppress("DEPRECATION") window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON) }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    alarmId = intent.getStringExtra(AamuAlarmCoordinator.ID)
    render()
  }
  override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); alarmId = intent.getStringExtra(AamuAlarmCoordinator.ID); render() }
  private fun render() {
    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(28), dp(64), dp(28), dp(38)); setBackgroundColor(color(R.color.aamu_canvas))
    }
    layout.addView(TextView(this).apply { text = "aamu"; textSize = 22f; typeface = font; setTextColor(color(R.color.aamu_text_secondary)) })
    layout.addView(TextView(this).apply {
      text = android.text.format.DateFormat.getTimeFormat(this@AamuAlarmActivity).format(Date()); textSize = 64f
      typeface = if (Build.VERSION.SDK_INT >= 28) Typeface.create(font, 300, false) else font
      setTextColor(color(R.color.aamu_text_primary)); gravity = Gravity.CENTER
    }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(60) })
    layout.addView(View(this), LinearLayout.LayoutParams(1, 0, 1f))
    addButton(layout, "Stop", true) { id -> AamuAlarmCoordinator.systemStop(this, id); finish() }
    addButton(layout, "Snooze", false) { id -> AamuAlarmCoordinator.snooze(this, 300, "system_intent", id); finish() }
    addButton(layout, "Open Aamu", false) { _ -> startActivity(AamuAlarmCoordinator.openApp(this)); finish() }
    setContentView(layout)
  }
  private fun addButton(parent: LinearLayout, title: String, primary: Boolean, action: (String) -> Unit) {
    val button = Button(this).apply {
      text = title; textSize = 18f; typeface = font; isAllCaps = false
      setTextColor(color(if (primary) R.color.aamu_text_on_accent else R.color.aamu_text_primary))
      background = GradientDrawable().apply {
        cornerRadius = dp(40).toFloat(); setColor(color(if (primary) R.color.aamu_accent else R.color.aamu_surface))
      }
      setOnClickListener { alarmId?.let { id -> try { action(id) } catch (_: Exception) { /* Keep live controls when scheduling fails. */ } } }
    }
    parent.addView(button, LinearLayout.LayoutParams(-1, dp(68)).apply { topMargin = dp(14) })
  }
  override fun onResume() { super.onResume(); handler.post(monitor) }
  override fun onPause() { handler.removeCallbacks(monitor); super.onPause() }
}
