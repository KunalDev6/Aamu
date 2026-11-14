const fs = require('node:fs');
const path = require('node:path');
const { withInfoPlist, withXcodeProject, createRunOncePlugin } = require('expo/config-plugins');

const WIDGET = 'AamuAlarmWidget';
const APP_PACKAGE = 'AamuAppIntentsPackage';

function withAamuAlarm(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSAlarmKitUsageDescription =
      'Aamu uses alarms to wake you at the time you choose, including when your phone is locked.';
    mod.modResults.NSSupportsLiveActivities = true;
    mod.modResults.RCTAsyncStorageExcludeFromBackup = true;
    return mod;
  });

  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const ios = mod.modRequest.platformProjectRoot;
    const source = path.join(mod.modRequest.projectRoot, 'modules', 'aamu-alarm');
    const widgetDirectory = path.join(ios, WIDGET);
    const appDirectory = path.join(ios, APP_PACKAGE);
    fs.mkdirSync(widgetDirectory, { recursive: true });
    fs.mkdirSync(appDirectory, { recursive: true });
    fs.copyFileSync(path.join(source, 'widget', 'AamuAlarmWidget.swift'),
      path.join(widgetDirectory, 'AamuAlarmWidget.swift'));
    fs.copyFileSync(path.join(source, 'ios', 'AamuAlarmMetadata.swift'),
      path.join(widgetDirectory, 'AamuAlarmMetadata.swift'));
    fs.copyFileSync(path.join(source, 'app', 'AamuAppIntentsPackage.swift'),
      path.join(appDirectory, 'AamuAppIntentsPackage.swift'));
    fs.writeFileSync(path.join(widgetDirectory, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDisplayName</key><string>Aamu</string>
  <key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key><string>XPC!</string>
  <key>CFBundleShortVersionString</key><string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key><string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key><dict>
    <key>NSExtensionPointIdentifier</key><string>com.apple.widgetkit-extension</string>
  </dict>
</dict></plist>
`);

    const appTarget = project.getFirstTarget();
    const targets = project.pbxNativeTargetSection();
    let widgetId = Object.keys(targets).find((key) => !key.endsWith('_comment')
      && String(targets[key].name).replaceAll('"', '') === WIDGET);
    if (!widgetId) {
      // node-xcode expects these optional sections to exist when adding a dependency.
      const objects = project.hash.project.objects;
      objects.PBXTargetDependency ??= {};
      objects.PBXContainerItemProxy ??= {};
      const target = project.addTarget(WIDGET, 'app_extension', WIDGET,
        `${mod.ios?.bundleIdentifier || 'com.aamu.recovery'}.alarm-widget`);
      widgetId = target.uuid;
      project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', widgetId);
      project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', widgetId);
      project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', widgetId);
    }

    const rootGroup = project.getFirstProject().firstProject.mainGroup;
    const widgetGroup = project.pbxGroupByName(WIDGET)
      ? Object.keys(project.hash.project.objects.PBXGroup).find((key) =>
          !key.endsWith('_comment') && project.hash.project.objects.PBXGroup[key] === project.pbxGroupByName(WIDGET))
      : project.addPbxGroup([], WIDGET).uuid;
    const packageGroup = project.pbxGroupByName(APP_PACKAGE)
      ? Object.keys(project.hash.project.objects.PBXGroup).find((key) =>
          !key.endsWith('_comment') && project.hash.project.objects.PBXGroup[key] === project.pbxGroupByName(APP_PACKAGE))
      : project.addPbxGroup([], APP_PACKAGE).uuid;
    for (const group of [widgetGroup, packageGroup]) {
      const children = project.hash.project.objects.PBXGroup[rootGroup].children;
      if (!children.some((child) => child.value === group)) project.addToPbxGroup(group, rootGroup);
    }
    for (const filename of ['AamuAlarmWidget.swift', 'AamuAlarmMetadata.swift']) {
      const relative = `${WIDGET}/${filename}`;
      if (!project.hasFile(relative)) project.addSourceFile(relative, { target: widgetId }, widgetGroup);
    }
    const packageFile = `${APP_PACKAGE}/AamuAppIntentsPackage.swift`;
    if (!project.hasFile(packageFile)) {
      project.addSourceFile(packageFile, { target: appTarget.uuid }, packageGroup);
    }

    const configList = project.hash.project.objects.XCConfigurationList[
      project.pbxNativeTargetSection()[widgetId].buildConfigurationList];
    const appConfigList = project.hash.project.objects.XCConfigurationList[
      appTarget.firstTarget.buildConfigurationList];
    const configurations = project.pbxXCBuildConfigurationSection();
    const appSettings = configurations[appConfigList.buildConfigurations[0].value].buildSettings;
    for (const entry of configList.buildConfigurations) {
      const settings = configurations[entry.value].buildSettings;
      Object.assign(settings, {
        INFOPLIST_FILE: `"${WIDGET}/Info.plist"`,
        GENERATE_INFOPLIST_FILE: 'NO',
        IPHONEOS_DEPLOYMENT_TARGET: '26.0',
        SWIFT_VERSION: '5.9',
        TARGETED_DEVICE_FAMILY: '"1,2"',
        SDKROOT: 'iphoneos',
        APPLICATION_EXTENSION_API_ONLY: 'YES',
        CODE_SIGN_STYLE: 'Automatic',
        CURRENT_PROJECT_VERSION: appSettings.CURRENT_PROJECT_VERSION || '1',
        MARKETING_VERSION: appSettings.MARKETING_VERSION || '1.0',
        ENABLE_USER_SCRIPT_SANDBOXING: 'NO',
      });
      if (appSettings.DEVELOPMENT_TEAM) settings.DEVELOPMENT_TEAM = appSettings.DEVELOPMENT_TEAM;
    }
    // node-xcode's file factory leaves optional undefined properties behind;
    // omit them instead of emitting literal `undefined` Xcode build settings.
    for (const sectionName of ['PBXFileReference', 'PBXBuildFile', 'PBXGroup']) {
      for (const entry of Object.values(project.hash.project.objects[sectionName] || {})) {
        if (!entry || typeof entry !== 'object') continue;
        for (const key of Object.keys(entry)) {
          if (entry[key] === undefined || entry[key] === 'undefined') delete entry[key];
        }
      }
    }
    return mod;
  });
}

module.exports = createRunOncePlugin(withAamuAlarm, 'aamu-alarm', '0.1.0');
