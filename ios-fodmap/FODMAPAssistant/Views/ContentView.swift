import SwiftUI

/// Root tab bar: Search foods, browse by Category, saved Favourites, and About.
struct ContentView: View {
    var body: some View {
        TabView {
            SearchView()
                .tabItem { Label("Search", systemImage: "magnifyingglass") }

            IBSFriendlyView()
                .tabItem { Label("IBS-Safe", systemImage: "leaf") }

            CategoriesView()
                .tabItem { Label("Categories", systemImage: "square.grid.2x2") }

            FavouritesView()
                .tabItem { Label("Favourites", systemImage: "star") }

            AboutView()
                .tabItem { Label("About", systemImage: "info.circle") }
        }
    }
}

#Preview {
    ContentView().environmentObject(FoodStore())
}
