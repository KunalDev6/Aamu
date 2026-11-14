import Foundation

@main
struct PrivateStorageTests {
  static func main() throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent("aamu-storage-test-" + UUID().uuidString, isDirectory: true)
    defer { try? FileManager.default.removeItem(at: root) }
    let support = root.appendingPathComponent("Application Support", isDirectory: true)
    let documents = root.appendingPathComponent("Documents", isDirectory: true)
    let storage = AamuPrivateStorage(applicationSupport: support, documents: documents, bundleIdentifier: "com.aamu.recovery")
    try FileManager.default.createDirectory(at: storage.legacyAudioDirectory, withIntermediateDirectories: true)
    let legacy = storage.legacyAudioDirectory.appendingPathComponent("old.m4a")
    try Data([1, 2, 3]).write(to: legacy)
    let directories = try storage.prepare()
    precondition(directories["audioDirectoryUri"] == storage.audioDirectory.resolvingSymlinksInPath().absoluteString)
    for url in [support, storage.audioDirectory, storage.legacyAudioDirectory, legacy] {
      let excluded = try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
      precondition(excluded == true)
    }
    let audio = storage.audioDirectory.appendingPathComponent("new.m4a")
    try Data([4, 5, 6]).write(to: audio)
    let protectedAudio = try storage.protectAudioFile(audio.absoluteString)
    let protectedLegacy = try storage.protectAudioFile(legacy.absoluteString)
    let audioExcluded = try audio.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
    precondition(protectedAudio == audio.resolvingSymlinksInPath().absoluteString)
    precondition(audioExcluded == true)
    precondition(protectedLegacy == legacy.resolvingSymlinksInPath().absoluteString)
    // Copy operations can reset resource flags. A Save must protect the final
    // destination after copying, even when its parent is already excluded.
    let copied = storage.audioDirectory.appendingPathComponent("copied.m4a")
    try FileManager.default.copyItem(at: legacy, to: copied)
    var resetCopy = copied
    var resetValues = URLResourceValues()
    resetValues.isExcludedFromBackup = false
    try resetCopy.setResourceValues(resetValues)
    _ = try storage.protectAudioFile(copied.absoluteString)
    let copiedExcluded = try URL(fileURLWithPath: copied.path).resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
    precondition(copiedExcluded == true)
    func rejects(_ uri: String) {
      do { _ = try storage.protectAudioFile(uri); preconditionFailure("Invalid audio accepted") }
      catch { precondition(error.localizedDescription == "The private recording is unavailable.") }
    }
    rejects("https://example.invalid/audio.m4a")
    rejects(audio.absoluteString + "?remote=true")
    let unrelated = documents.appendingPathComponent("unrelated.m4a")
    try Data([7]).write(to: unrelated)
    rejects(unrelated.absoluteString)
    let escaped = storage.audioDirectory.appendingPathComponent("escaped.m4a")
    try FileManager.default.createSymbolicLink(at: escaped, withDestinationURL: unrelated)
    rejects(escaped.absoluteString)
    let empty = storage.audioDirectory.appendingPathComponent("empty.m4a")
    try Data().write(to: empty)
    rejects(empty.absoluteString)
    print("Private storage checks passed: exclusions, copy flag reset, new/legacy ownership, remote/query/outside/symlink/empty rejection")
  }
}
