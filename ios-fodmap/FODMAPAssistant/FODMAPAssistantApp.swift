import SwiftUI

@main
struct FODMAPAssistantApp: App {
    @StateObject private var store = FoodStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
