import SwiftUI

/// A curated list of foods you *can* eat on a low-FODMAP diet, each with its
/// safe serving amount. High-FODMAP foods are excluded; moderate foods are
/// gut-friendly only within the portion shown.
struct IBSFriendlyView: View {
    @EnvironmentObject private var store: FoodStore
    @State private var levelFilter: FodmapLevel?

    private var foods: [Food] {
        store.ibsFriendly(level: levelFilter)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(foods) { food in
                        NavigationLink(value: food) {
                            FoodRowView(food: food)
                        }
                    }
                } header: {
                    Text("\(foods.count) IBS-friendly food\(foods.count == 1 ? "" : "s")")
                } footer: {
                    Text("🟡 foods are only gut-friendly within the serving shown — going over tips them high FODMAP.")
                }
            }
            .listStyle(.insetGrouped)
            .safeAreaInset(edge: .top) {
                filterBar
            }
            .navigationTitle("IBS-Friendly")
            .navigationDestination(for: Food.self) { food in
                FoodDetailView(food: food)
            }
        }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip(title: "All safe", isOn: levelFilter == nil, color: .accentColor) { levelFilter = nil }
                chip(title: "🟢 Any serving", isOn: levelFilter == .low, color: FodmapLevel.low.color) {
                    levelFilter = (levelFilter == .low) ? nil : .low
                }
                chip(title: "🟡 Watch portion", isOn: levelFilter == .moderate, color: FodmapLevel.moderate.color) {
                    levelFilter = (levelFilter == .moderate) ? nil : .moderate
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }

    private func chip(title: String, isOn: Bool, color: Color, action: @escaping () -> Void) -> some View {
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
