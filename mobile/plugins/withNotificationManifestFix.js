const { withAndroidManifest } = require('expo/config-plugins');

/**
 * expo-notifications and @react-native-firebase/messaging both declare the same
 * `com.google.firebase.messaging.default_notification_*` meta-data, which makes the
 * Android manifest merger fail. This plugin marks the app's own declarations with
 * `tools:replace` so they win over the library defaults (our brand color + channel),
 * which is the officially supported way to resolve a manifest merge conflict.
 */
const CONFLICTING_META_DATA = [
  'com.google.firebase.messaging.default_notification_channel_id',
  'com.google.firebase.messaging.default_notification_color',
  'com.google.firebase.messaging.default_notification_icon',
];

const withNotificationManifestFix = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = manifest.application?.[0];
    if (!application?.['meta-data']) {
      return cfg;
    }

    let patched = 0;
    for (const meta of application['meta-data']) {
      const name = meta.$?.['android:name'];
      if (!CONFLICTING_META_DATA.includes(name)) continue;

      const attr =
        meta.$['android:value'] !== undefined ? 'android:value' : 'android:resource';
      meta.$['tools:replace'] = attr;
      patched += 1;
    }

    return cfg;
  });

module.exports = withNotificationManifestFix;
