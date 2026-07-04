import SwiftUI

/// Add or edit a task. Reused for both flows: pass `nil` to create.
struct TaskEditorView: View {
    @Environment(\.dismiss) private var dismiss

    private let existing: TaskItem?
    private let onSave: (TaskItem) -> Void

    @State private var title: String
    @State private var notes: String
    @State private var hasDueDate: Bool
    @State private var dueDate: Date
    @State private var priority: Priority

    init(task: TaskItem?, onSave: @escaping (TaskItem) -> Void) {
        self.existing = task
        self.onSave = onSave
        _title = State(initialValue: task?.title ?? "")
        _notes = State(initialValue: task?.notes ?? "")
        _hasDueDate = State(initialValue: task?.dueDate != nil)
        _dueDate = State(initialValue: task?.dueDate ?? Date().addingTimeInterval(3600))
        _priority = State(initialValue: task?.priority ?? .medium)
    }

    private var trimmedTitle: String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("What do you need to remember?", text: $title, axis: .vertical)
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                }

                Section {
                    Toggle("Remind me", isOn: $hasDueDate.animation())
                    if hasDueDate {
                        DatePicker(
                            "Date & time",
                            selection: $dueDate,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                    }
                } footer: {
                    if hasDueDate && dueDate <= Date() {
                        Text("This time is in the past, so no notification will be scheduled.")
                    }
                }

                Section("Priority") {
                    Picker("Priority", selection: $priority) {
                        ForEach(Priority.allCases) { level in
                            Text(level.label).tag(level)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle(existing == nil ? "New Task" : "Edit Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(trimmedTitle.isEmpty)
                }
            }
        }
    }

    private func save() {
        guard !trimmedTitle.isEmpty else { return }
        var task = existing ?? TaskItem(title: "")
        task.title = trimmedTitle
        task.notes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        task.dueDate = hasDueDate ? dueDate : nil
        task.priority = priority
        onSave(task)
        dismiss()
    }
}

#Preview {
    TaskEditorView(task: nil) { _ in }
}
