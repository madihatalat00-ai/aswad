import Foundation
import UserNotifications

/// Owns the task list, persists it to `UserDefaults`, and keeps each task's
/// local notification in sync with its due date and completion state.
@MainActor
final class TaskStore: ObservableObject {
    @Published private(set) var tasks: [TaskItem] = []

    private let storageKey = "remindme.tasks.v1"

    init() {
        load()
    }

    // MARK: - Queries

    func count(for filter: TaskFilter) -> Int {
        tasks.filter { filter.matches($0) }.count
    }

    var hasCompleted: Bool {
        tasks.contains { $0.isDone }
    }

    /// Incomplete first, then soonest due (undated last), then priority, then newest.
    func sorted(matching filter: TaskFilter) -> [TaskItem] {
        tasks
            .filter { filter.matches($0) }
            .sorted { a, b in
                if a.isDone != b.isDone { return !a.isDone }
                switch (a.dueDate, b.dueDate) {
                case let (x?, y?) where x != y: return x < y
                case (_?, nil): return true
                case (nil, _?): return false
                default: break
                }
                if a.priority.sortRank != b.priority.sortRank {
                    return a.priority.sortRank < b.priority.sortRank
                }
                return a.createdAt > b.createdAt
            }
    }

    // MARK: - Mutations

    func add(_ task: TaskItem) {
        tasks.append(task)
        persist()
        scheduleNotification(for: task)
    }

    func update(_ task: TaskItem) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index] = task
        persist()
        cancelNotification(for: task.id)
        scheduleNotification(for: task)
    }

    func delete(_ task: TaskItem) {
        tasks.removeAll { $0.id == task.id }
        persist()
        cancelNotification(for: task.id)
    }

    func toggleDone(_ task: TaskItem) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].isDone.toggle()
        let updated = tasks[index]
        persist()
        if updated.isDone {
            cancelNotification(for: updated.id)
        } else {
            scheduleNotification(for: updated)
        }
    }

    func clearCompleted() {
        for task in tasks where task.isDone {
            cancelNotification(for: task.id)
        }
        tasks.removeAll { $0.isDone }
        persist()
    }

    // MARK: - Persistence

    private func load() {
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let decoded = try? JSONDecoder().decode([TaskItem].self, from: data)
        else { return }
        tasks = decoded
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(tasks) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    // MARK: - Notifications

    /// Schedules a one-shot local notification for a task with a future due date.
    private func scheduleNotification(for task: TaskItem) {
        guard let due = task.dueDate, !task.isDone, due > Date() else { return }

        let content = UNMutableNotificationContent()
        content.title = task.title
        content.body = task.notes.isEmpty ? "This task is due now." : task.notes
        content.sound = .default

        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: due
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(
            identifier: task.id.uuidString,
            content: content,
            trigger: trigger
        )
        UNUserNotificationCenter.current().add(request)
    }

    private func cancelNotification(for id: UUID) {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [id.uuidString])
    }
}
