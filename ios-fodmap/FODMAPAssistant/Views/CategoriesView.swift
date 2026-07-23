import SwiftUI

/// Browse foods grouped by category, each showing a count of safe foods.
struct CategoriesView: View {
    @EnvironmentObject private var store: FoodStore

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.categories, id: \.self) { category in
                    NavigationLink {
                        CategoryDetailView(category: category)
                    } label: {
                        HStack(spacing: 14) {
                            Image(systemName: FoodCategory.systemImage(for: category))
                                .font(.title3)
                                .frame(width: 32)
                                .foregroundStyle(Color.accentColor)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(category)
                                    .font(.body.weight(.medium))
                                Text(countSummary(for: category))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Categories")
            .navigationDestination(for: Food.self) { food in
                FoodDetailView(food: food)
            }
        }
    }

    private func countSummary(for category: String) -> String {
        let foods = store.foods(in: category)
        let safe = foods.filter { $0.level == .low }.count
        return "\(foods.count) foods · \(safe) safe to enjoy"
    }
}

/// The foods within one category, sorted safe-first.
struct CategoryDetailView: View {
    @EnvironmentObject private var store: FoodStore
    let category: String

    var body: some View {
        List {
            ForEach(store.foods(in: category)) { food in
                NavigationLink(value: food) {
                    FoodRowView(food: food)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(category)
        .navigationBarTitleDisplayMode(.inline)
    }
}
