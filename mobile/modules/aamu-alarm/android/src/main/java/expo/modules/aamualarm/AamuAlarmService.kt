package expo.modules.aamualarm

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

class AamuAlarmService : Service() {
  private var player: MediaPlayer? = null
  private var focus: AudioFocusRequest? = null
  private var alarmId: String? = null
  private var resumeOnFocusGain = false
  private val audio by lazy { getSystemService(AudioManager::class.java) }
  private val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
  private val listener = AudioManager.OnAudioFocusChangeListener { value ->
    try {
      if (value == AudioManager.AUDIOFOCUS_GAIN) {
        val id = alarmId
        if (resumeOnFocusGain && id != null && AamuAlarmCoordinator.isAlerting(this, id)
          && AamuAlarmCoordinator.authorized(this)) { resumeOnFocusGain = false; player?.start() }
      } else if (value == AudioManager.AUDIOFOCUS_LOSS) {
        resumeOnFocusGain = false; player?.pause()
      } else if (value == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT || value == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
        resumeOnFocusGain = resumeOnFocusGain || player?.isPlaying == true; player?.pause()
      }
    } catch (_: Exception) { }
  }

  override fun onBind(intent: Intent?): IBinder? = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val id = intent?.getStringExtra(AamuAlarmCoordinator.ID)
    if (id == null || !AamuAlarmCoordinator.isAlerting(this, id)) { stopSelf(); return START_NOT_STICKY }
    AamuAlarmCoordinator.ensureChannel(this)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, AamuAlarmCoordinator.CHANNEL) else Notification.Builder(this)
    val open = PendingIntent.getActivity(this, 1, AamuAlarmCoordinator.openApp(this), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val notification = builder.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Aamu").setContentText("Alarm").setCategory(Notification.CATEGORY_ALARM)
      .setPriority(Notification.PRIORITY_HIGH)
      .setVisibility(Notification.VISIBILITY_PUBLIC).setOngoing(true).setOnlyAlertOnce(true)
      .setContentIntent(open).setFullScreenIntent(AamuAlarmCoordinator.activityIntent(this, id), true)
      .addAction(Notification.Action.Builder(null, "Stop", AamuAlarmCoordinator.action(this, AamuAlarmCoordinator.STOP, id)).build())
      .addAction(Notification.Action.Builder(null, "Snooze", AamuAlarmCoordinator.action(this, AamuAlarmCoordinator.SNOOZE, id)).build())
      .build()
    if (Build.VERSION.SDK_INT >= 34) startForeground(9151, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)
    else startForeground(9151, notification)
    try { AamuAlarmCoordinator.recordRinging(this, id) } catch (_: Exception) { }
    if (alarmId != id) { releaseAudio(); alarmId = id; startAudio() }
    return START_REDELIVER_INTENT
  }

  private fun startAudio() {
    try {
      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: return
      player = MediaPlayer().apply {
        setAudioAttributes(attributes); setWakeMode(this@AamuAlarmService, PowerManager.PARTIAL_WAKE_LOCK)
        setDataSource(this@AamuAlarmService, uri); isLooping = true
        setOnErrorListener { _, _, _ -> releaseAudio(); true }
        prepare()
      }
      val granted = if (Build.VERSION.SDK_INT >= 26) {
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
          .setAudioAttributes(attributes).setAcceptsDelayedFocusGain(true).setWillPauseWhenDucked(true)
          .setOnAudioFocusChangeListener(listener).build()
        focus = request; audio.requestAudioFocus(request)
      } else {
        @Suppress("DEPRECATION")
        audio.requestAudioFocus(listener, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
      }
      when (granted) {
        AudioManager.AUDIOFOCUS_REQUEST_GRANTED -> player?.start()
        AudioManager.AUDIOFOCUS_REQUEST_DELAYED -> resumeOnFocusGain = true
        else -> releaseAudio()
      }
    } catch (_: Exception) { releaseAudio() } // Native visual controls remain available on output failure.
  }
  private fun releaseAudio() {
    resumeOnFocusGain = false
    try { player?.release() } catch (_: Exception) { }; player = null
    if (Build.VERSION.SDK_INT >= 26) focus?.let { audio.abandonAudioFocusRequest(it) }
    else { @Suppress("DEPRECATION") audio.abandonAudioFocus(listener) }
    focus = null
  }
  override fun onDestroy() {
    releaseAudio(); alarmId = null
    stopForeground(STOP_FOREGROUND_REMOVE); super.onDestroy()
  }
}
