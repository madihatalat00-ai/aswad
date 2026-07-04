import Foundation

/// A single reminder. Persisted as JSON and used to schedule a local
/// notification when `dueDate` is set and in the future.
struct TaskItem: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var title: String
    var notes: String = ""
    var dueDate: Date? = nil
    var priority: Priority = .medium
    var isDone: Bool = false
    var createdAt: Date = Date()

    var isOverdue: Bool {
        guard !isDone, let dueDate else { return false }
        return dueDate < Date()
    }
}
