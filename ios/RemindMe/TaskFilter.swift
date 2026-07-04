import Foundation

/// The segmented views along the top of the task list.
enum TaskFilter: String, CaseIterable, Identifiable {
    case all
    case today
    case upcoming
    case overdue
    case done

    var id: String { rawValue }

    var label: String {
        switch self {
        case .all:      return "All"
        case .today:    return "Today"
        case .upcoming: return "Upcoming"
        case .overdue:  return "Overdue"
        case .done:     return "Done"
        }
    }

    func matches(_ task: TaskItem) -> Bool {
        let calendar = Calendar.current
        switch self {
        case .all:
            return true
        case .done:
            return task.isDone
        case .today:
            guard !task.isDone, let due = task.dueDate else { return false }
            return calendar.isDateInToday(due)
        case .overdue:
            guard !task.isDone, let due = task.dueDate else { return false }
            return due < Date()
        case .upcoming:
            guard !task.isDone else { return false }
            guard let due = task.dueDate else { return true }
            return due > Date() && !calendar.isDateInToday(due)
        }
    }
}
