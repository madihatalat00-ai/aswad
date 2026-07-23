import SwiftUI

/// Explains what FODMAPs are, how to read the app, and an important
/// medical disclaimer.
struct AboutView: View {
    @EnvironmentObject private var store: FoodStore

    var body: some View {
        NavigationStack {
            List {
                Section("What are FODMAPs?") {
                    Text("FODMAPs are fermentable carbs — **F**ermentable **O**ligosaccharides, **D**isaccharides, **M**onosaccharides **A**nd **P**olyols — that can trigger bloating, gas, and pain in people with IBS or FODMAP sensitivity. This app helps you spot which foods are high or low FODMAP.")
                        .font(.subheadline)
                }

                Section("The five FODMAP groups") {
                    fodmapRow("Fructans", "Wheat, onion, garlic")
                    fodmapRow("GOS", "Legumes, cashews, pistachios")
                    fodmapRow("Lactose", "Milk, soft cheese, yogurt")
                    fodmapRow("Excess fructose", "Honey, apples, mango")
                    fodmapRow("Polyols", "Stone fruit, mushrooms, sweeteners")
                }

                Section("How to read a food") {
                    legendRow(.low)
                    legendRow(.moderate)
                    legendRow(.high)
                    Text("Portion is key: many foods are safe in a small serving but high FODMAP in a large one. Always check the serving guidance.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Database") {
                    LabeledContent("Foods", value: "\(store.foods.count)")
                    LabeledContent("Categories", value: "\(store.categories.count)")
                }

                Section {
                    Text("This app is for general education only and is not medical advice. FODMAP tolerance is individual, and thresholds are based on published Monash University research. Work with a doctor or dietitian, especially before the reintroduction phase.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("Important")
                }
            }
            .navigationTitle("About")
        }
    }

    private func fodmapRow(_ name: String, _ examples: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(name).font(.subheadline.weight(.semibold))
            Text(examples).font(.caption).foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }

    private func legendRow(_ level: FodmapLevel) -> some View {
        HStack(spacing: 12) {
            LevelBadge(level: level, compact: true)
            Text(level.summary)
                .font(.footnote)
                .foregroundStyle(.primary)
        }
    }
}
