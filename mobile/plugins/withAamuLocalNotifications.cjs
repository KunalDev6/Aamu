const { withAndroidManifest, withEntitlementsPlist, withInfoPlist, AndroidConfig } = require('expo/config-plugins');

// Local notifications must never opt this app into a remote push service.
module.exports = function withAamuLocalNotifications(config) {
  config = withEntitlementsPlist(config, mod => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
  config = withInfoPlist(config, mod => {
    if (Array.isArray(mod.modResults.UIBackgroundModes)) {
      mod.modResults.UIBackgroundModes = mod.modResults.UIBackgroundModes.filter(value => value !== 'remote-notification');
    }
    return mod;
  });
  return withAndroidManifest(config, mod => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application['meta-data'] ??= [];
    for (const name of ['firebase_messaging_auto_init_enabled', 'firebase_analytics_collection_enabled']) {
      application['meta-data'] = application['meta-data'].filter(item => item.$['android:name'] !== name);
      application['meta-data'].push({ $: { 'android:name': name, 'android:value': 'false' } });
    }
    return mod;
  });
};
