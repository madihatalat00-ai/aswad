import SwiftUI

struct TaskRowView: View {
    let task: TaskItem
    let onToggle: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 2)
                .fill(task.priority.color)
                .frame(width: 4)

            Button(action: onToggle) {
                Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(task.isDone ? Color.green : Color.secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .strikethrough(task.isDone)
                    .foregroundStyle(task.isDone ? Color.secondary : Color.primary)

                if !task.notes.isEmpty {
                    Text(task.notes)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 8) {
                    if let due = task.dueDate {
                        Label(dueText(due), systemImage: task.isOverdue ? "exclamationmark.triangle.fill" : "clock")
                            .font(.caption)
                            .foregroundStyle(task.isOverdue ? Color.red : Color.secondary)
                    }

                    Text(task.priority.label)
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(task.priority.color.opacity(0.18)))
                        .foregroundStyle(task.priority.color)
                }
                .padding(.top, 2)
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
        .opacity(task.isDone ? 0.6 : 1)
    }

    private func dueText(_ date: Date) -> String {
        let calendar = Calendar.current
        let time = date.formatted(date: .omitted, time: .shortened)
        let prefix = task.isOverdue ? "Overdue · " : ""

        if calendar.isDateInToday(date) {
            return prefix + "Today \(time)"
        }
        if calendar.isDateInTomorrow(date) {
            return "Tomorrow \(time)"
        }
        let day = date.formatted(.dateTime.month(.abbreviated).day())
        return prefix + "\(day) \(time)"
    }
}
