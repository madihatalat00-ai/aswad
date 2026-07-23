import Foundation
import SwiftUI

/// Loads the bundled food database, powers search and filtering, and
/// persists the user's favourites to `UserDefaults`.
@MainActor
final class FoodStore: ObservableObject {
    /// Every food, sorted safe-first then alphabetically.
    @Published private(set) var foods: [Food] = []
    /// Names the user has saved for quick reference.
    @Published private(set) var favouriteIDs: Set<String> = []

    private let favouritesKey = "fodmap.favourites.v1"

    init() {
        loadFoods()
        loadFavourites()
    }

    // MARK: - Loading

    private func loadFoods() {
        guard
            let url = Bundle.main.url(forResource: "foods", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let decoded = try? JSONDecoder().decode([Food].self, from: data)
        else {
            assertionFailure("foods.json is missing or malformed")
            return
        }
        foods = decoded.sorted { a, b in
            if a.level.sortRank != b.level.sortRank { return a.level.sortRank < b.level.sortRank }
            return a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
        }
    }

    // MARK: - Categories

    /// Distinct categories in their natural (database) order.
    var categories: [String] {
        var seen = Set<String>()
        var ordered: [String] = []
        for food in foods where !seen.contains(food.category) {
            seen.insert(food.category)
            ordered.append(food.category)
        }
        return ordered.sorted()
    }

    func foods(in category: String) -> [Food] {
        foods.filter { $0.category == category }
    }

    // MARK: - Search & filter

    /// Filters by free-text query and an optional level. Query matches the
    /// food name, its category, or any FODMAP group it contains.
    func results(query: String, level: FodmapLevel?) -> [Food] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return foods.filter { food in
            if let level, food.level != level { return false }
            guard !trimmed.isEmpty else { return true }
            if food.name.localizedCaseInsensitiveContains(trimmed) { return true }
            if food.category.localizedCaseInsensitiveContains(trimmed) { return true }
            return food.fodmaps.contains { $0.localizedCaseInsensitiveContains(trimmed) }
        }
    }

    // MARK: - Favourites

    func isFavourite(_ food: Food) -> Bool {
        favouriteIDs.contains(food.id)
    }

    func toggleFavourite(_ food: Food) {
        if favouriteIDs.contains(food.id) {
            favouriteIDs.remove(food.id)
        } else {
            favouriteIDs.insert(food.id)
        }
        saveFavourites()
    }

    var favouriteFoods: [Food] {
        foods.filter { favouriteIDs.contains($0.id) }
    }

    private func loadFavourites() {
        guard
            let data = UserDefaults.standard.data(forKey: favouritesKey),
            let decoded = try? JSONDecoder().decode(Set<String>.self, from: data)
        else { return }
        favouriteIDs = decoded
    }

    private func saveFavourites() {
        guard let data = try? JSONEncoder().encode(favouriteIDs) else { return }
        UserDefaults.standard.set(data, forKey: favouritesKey)
    }
}
