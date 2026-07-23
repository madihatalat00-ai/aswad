import SwiftUI

/// The main screen: type a food to instantly see whether it's safe, with a
/// quick filter by verdict.
struct SearchView: View {
    @EnvironmentObject private var store: FoodStore
    @State private var query = ""
    @State private var levelFilter: FodmapLevel?

    private var results: [Food] {
        store.results(query: query, level: levelFilter)
    }

    var body: some View {
        NavigationStack {
            Group {
                if results.isEmpty {
                    ContentUnavailableCompat(
                        title: "No foods found",
                        message: "Try another name, or browse by category.",
                        systemImage: "magnifyingglass"
                    )
                } else {
                    List {
                        Section {
                            ForEach(results) { food in
                                NavigationLink(value: food) {
                                    FoodRowView(food: food)
                                }
                            }
                        } header: {
                            Text("\(results.count) food\(results.count == 1 ? "" : "s")")
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .safeAreaInset(edge: .top) {
                filterBar
            }
            .navigationTitle("Can I Eat It?")
            .navigationDestination(for: Food.self) { food in
                FoodDetailView(food: food)
            }
            .searchable(text: $query, prompt: "Search a food, e.g. garlic, apple, oats")
            .autocorrectionDisabled()
        }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(title: "All", isOn: levelFilter == nil, color: .accentColor) {
                    levelFilter = nil
                }
                ForEach(FodmapLevel.allCases, id: \.self) { level in
                    FilterChip(title: level.title, isOn: levelFilter == level, color: level.color) {
                        levelFilter = (levelFilter == level) ? nil : level
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }
}

/// Tappable filter pill.
private struct FilterChip: View {
    let title: String
    let isOn: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .foregroundStyle(isOn ? Color.white : Color.primary)
                .background(isOn ? color : Color(.secondarySystemBackground), in: Capsule())
        }
        .buttonStyle(.plain)
    }
}

/// Lightweight stand-in for `ContentUnavailableView` so the app builds on
/// iOS 16 as well as 17+.
struct ContentUnavailableCompat: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 44))
                .foregroundStyle(.secondary)
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
