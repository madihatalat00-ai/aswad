import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var store: TaskStore
    @State private var filter: TaskFilter = .all
    @State private var editingTask: TaskItem?
    @State private var isAdding = false

    private var visibleTasks: [TaskItem] {
        store.sorted(matching: filter)
    }

    var body: some View {
        NavigationStack {
            Group {
                if visibleTasks.isEmpty {
                    emptyState
                } else {
                    taskList
                }
            }
            .navigationTitle("Remind Me")
            .safeAreaInset(edge: .top, spacing: 0) { filterBar }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isAdding = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.body.weight(.semibold))
                    }
                    .accessibilityLabel("Add task")
                }
                if store.hasCompleted {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Clear Done") {
                            withAnimation { store.clearCompleted() }
                        }
                    }
                }
            }
            .sheet(isPresented: $isAdding) {
                TaskEditorView(task: nil) { store.add($0) }
            }
            .sheet(item: $editingTask) { task in
                TaskEditorView(task: task) { store.update($0) }
            }
        }
    }

    // MARK: - Filter bar

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(TaskFilter.allCases) { option in
                    filterChip(option)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }

    private func filterChip(_ option: TaskFilter) -> some View {
        let selected = filter == option
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) { filter = option }
        } label: {
            HStack(spacing: 6) {
                Text(option.label)
                Text("\(store.count(for: option))")
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 1)
                    .background(
                        Capsule().fill(
                            selected ? Color.white.opacity(0.25) : Color.secondary.opacity(0.18)
                        )
                    )
            }
            .font(.subheadline)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(
                Capsule().fill(selected ? Color.accentColor : Color(.secondarySystemBackground))
            )
            .foregroundStyle(selected ? Color.white : Color.primary)
        }
        .buttonStyle(.plain)
    }

    // MARK: - List

    private var taskList: some View {
        List {
            ForEach(visibleTasks) { task in
                TaskRowView(task: task) {
                    withAnimation { store.toggleDone(task) }
                }
                .contentShape(Rectangle())
                .onTapGesture { editingTask = task }
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        withAnimation { store.delete(task) }
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: store.tasks.isEmpty ? "bell.badge" : "line.3.horizontal.decrease.circle")
                .font(.system(size: 52))
                .foregroundStyle(.secondary)
            Text(store.tasks.isEmpty ? "No tasks yet" : "Nothing in this view")
                .font(.headline)
            Text(store.tasks.isEmpty
                 ? "Tap the + button to add your first reminder."
                 : "Try another filter above.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    ContentView().environmentObject(TaskStore())
}
