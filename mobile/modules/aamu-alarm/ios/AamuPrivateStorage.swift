import Foundation

enum AamuPrivateStorageError: LocalizedError {
  case unavailable, invalidAudioFile
  var errorDescription: String? {
    switch self {
    case .unavailable: return "Private local storage is unavailable."
    case .invalidAudioFile: return "The private recording is unavailable."
    }
  }
}

struct AamuPrivateStorage {
  let applicationSupport: URL
  let documents: URL
  let bundleIdentifier: String

  static var app: AamuPrivateStorage {
    AamuPrivateStorage(
      applicationSupport: FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0],
      documents: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0],
      bundleIdentifier: Bundle.main.bundleIdentifier ?? "com.aamu.recovery")
  }

  var audioDirectory: URL {
    applicationSupport.appendingPathComponent(bundleIdentifier, isDirectory: true)
      .appendingPathComponent("AamuAudio", isDirectory: true)
  }

  var legacyAudioDirectory: URL { documents.appendingPathComponent("aamu-audio", isDirectory: true) }

  func prepare() throws -> [String: String] {
    do {
      // The parent covers AsyncStorage's bundleID/RCTAsyncLocalStorage_V1 as
      // well as the native alarm journal. Recreated child files stay excluded.
      try createAndExclude(applicationSupport)
      try createAndExclude(applicationSupport.appendingPathComponent(bundleIdentifier, isDirectory: true))
      guard isInside(audioDirectory, root: applicationSupport) else { throw AamuPrivateStorageError.unavailable }
      try createAndExclude(audioDirectory)
      if FileManager.default.fileExists(atPath: legacyAudioDirectory.path) {
        guard isInside(legacyAudioDirectory, root: documents) else { throw AamuPrivateStorageError.unavailable }
        try exclude(legacyAudioDirectory)
        if let children = FileManager.default.enumerator(at: legacyAudioDirectory,
          includingPropertiesForKeys: [.isSymbolicLinkKey], options: []) {
          for case let child as URL in children {
            guard isInside(child, root: legacyAudioDirectory) else { throw AamuPrivateStorageError.unavailable }
            try exclude(child)
          }
        }
      }
      return ["audioDirectoryUri": audioDirectory.resolvingSymlinksInPath().absoluteString]
    } catch { throw AamuPrivateStorageError.unavailable }
  }

  func protectAudioFile(_ uri: String) throws -> String {
    do {
      _ = try prepare()
      guard let input = URL(string: uri), input.isFileURL,
            input.host == nil || input.host == "", input.query == nil, input.fragment == nil else {
        throw AamuPrivateStorageError.invalidAudioFile
      }
      let file = input.resolvingSymlinksInPath().standardizedFileURL
      let parent = file.deletingLastPathComponent()
      let allowed = [audioDirectory, legacyAudioDirectory].map { $0.resolvingSymlinksInPath().standardizedFileURL }
      guard allowed.contains(parent), file.pathExtension.lowercased() == "m4a",
            FileManager.default.fileExists(atPath: file.path) else { throw AamuPrivateStorageError.invalidAudioFile }
      let values = try file.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
      guard values.isRegularFile == true, (values.fileSize ?? 0) > 0 else { throw AamuPrivateStorageError.invalidAudioFile }
      try exclude(file)
      return file.absoluteString
    } catch { throw AamuPrivateStorageError.invalidAudioFile }
  }

  private func createAndExclude(_ url: URL) throws {
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    try exclude(url)
  }

  private func exclude(_ url: URL) throws {
    var target = url
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try target.setResourceValues(values)
    guard try URL(fileURLWithPath: target.path).resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else {
      throw AamuPrivateStorageError.unavailable
    }
  }

  private func isInside(_ url: URL, root: URL) -> Bool {
    url.resolvingSymlinksInPath().standardizedFileURL.path
      .hasPrefix(root.resolvingSymlinksInPath().standardizedFileURL.path + "/")
  }
}
