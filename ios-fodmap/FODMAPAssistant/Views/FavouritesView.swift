import SwiftUI

/// The user's saved foods — a personal safe/avoid shortlist for shopping.
struct FavouritesView: View {
    @EnvironmentObject private var store: FoodStore

    var body: some View {
        NavigationStack {
            Group {
                if store.favouriteFoods.isEmpty {
                    ContentUnavailableCompat(
                        title: "No favourites yet",
                        message: "Tap the star on any food to save it here for quick reference.",
                        systemImage: "star"
                    )
                } else {
                    List {
                        ForEach(store.favouriteFoods) { food in
                            NavigationLink(value: food) {
                                FoodRowView(food: food)
                            }
                        }
                        .onDelete(perform: removeFavourites)
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Favourites")
            .navigationDestination(for: Food.self) { food in
                FoodDetailView(food: food)
            }
        }
    }

    private func removeFavourites(at offsets: IndexSet) {
        let foods = store.favouriteFoods
        for index in offsets {
            store.toggleFavourite(foods[index])
        }
    }
}
