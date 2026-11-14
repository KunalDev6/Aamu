Pod::Spec.new do |s|
  s.name = 'AamuVoice'
  s.version = '0.1.0'
  s.summary = 'On-device window-based speech estimates for Aamu'
  s.description = s.summary
  s.license = { :type => 'UNLICENSED' }
  s.author = 'Aamu'
  s.homepage = 'https://example.invalid/aamu'
  s.platforms = { :ios => '26.0' }
  s.source = { :path => '.' }
  s.static_framework = true
  s.swift_version = '5.9'
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'SoundAnalysis', 'AVFoundation', 'CoreMedia'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
