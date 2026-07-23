import SwiftUI

/// Full detail for one food: the verdict, portion guidance, which FODMAP
/// groups it contains, and any tip. Can be saved to favourites.
struct FoodDetailView: View {
    @EnvironmentObject private var store: FoodStore
    let food: Food

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                verdictCard
                servingCard
                if !food.fodmaps.isEmpty {
                    fodmapCard
                }
                if !food.note.isEmpty {
                    tipCard
                }
            }
            .padding()
        }
        .navigationTitle(food.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    store.toggleFavourite(food)
                } label: {
                    Image(systemName: store.isFavourite(food) ? "star.fill" : "star")
                        .foregroundStyle(store.isFavourite(food) ? Color.yellow : Color.accentColor)
                }
                .accessibilityLabel(store.isFavourite(food) ? "Remove from favourites" : "Add to favourites")
            }
        }
    }

    // MARK: - Cards

    private var verdictCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: food.level.systemImage)
                    .font(.system(size: 34))
                    .foregroundStyle(.white)
                VStack(alignment: .leading, spacing: 2) {
                    Text(food.level.title)
                        .font(.title.bold())
                        .foregroundStyle(.white)
                    Label(food.category, systemImage: FoodCategory.systemImage(for: food.category))
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.9))
                }
                Spacer()
            }
            Text(food.level.summary)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.95))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(food.level.color.gradient, in: RoundedRectangle(cornerRadius: 16))
    }

    private var servingCard: some View {
        Card(title: "Serving guidance", systemImage: "scalemass") {
            Text(food.serving)
                .font(.body)
                .foregroundStyle(.primary)
        }
    }

    private var fodmapCard: some View {
        Card(title: "FODMAPs present", systemImage: "chart.pie") {
            FlowLayout(spacing: 8) {
                ForEach(food.fodmaps, id: \.self) { group in
                    Text(group)
                        .font(.footnote.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color(.secondarySystemBackground), in: Capsule())
                }
            }
        }
    }

    private var tipCard: some View {
        Card(title: "Tip", systemImage: "lightbulb") {
            Text(food.note)
                .font(.body)
                .foregroundStyle(.primary)
        }
    }
}

/// Rounded titled container used for each detail section.
private struct Card<Content: View>: View {
    let title: String
    let systemImage: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title, systemImage: systemImage)
                .font(.headline)
                .foregroundStyle(.secondary)
            content()
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(.separator).opacity(0.4), lineWidth: 1)
        )
    }
}

/// Simple wrapping layout so FODMAP tags flow onto multiple lines.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var rows = layout(subviews: subviews, maxWidth: maxWidth)
        return CGSize(width: maxWidth == .infinity ? rows.width : maxWidth, height: rows.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) {
        let result = layout(subviews: subviews, maxWidth: bounds.width)
        for placement in result.placements {
            let point = CGPoint(x: bounds.minX + placement.x, y: bounds.minY + placement.y)
            subviews[placement.index].place(at: point, proposal: ProposedViewSize(placement.size))
        }
    }

    private func layout(subviews: Subviews, maxWidth: CGFloat) -> (placements: [(index: Int, x: CGFloat, y: CGFloat, size: CGSize)], width: CGFloat, height: CGFloat) {
        var placements: [(index: Int, x: CGFloat, y: CGFloat, size: CGSize)] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var widest: CGFloat = 0

        for (index, subview) in subviews.enumerated() {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            placements.append((index, x, y, size))
            x += size.width + spacing
            widest = max(widest, x - spacing)
            rowHeight = max(rowHeight, size.height)
        }
        return (placements, widest, y + rowHeight)
    }
}
