import SwiftUI

/// A single food line in any list: colour bar, name, category, verdict badge.
struct FoodRowView: View {
    let food: Food

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 3)
                .fill(food.level.color)
                .frame(width: 5)

            VStack(alignment: .leading, spacing: 3) {
                Text(food.name)
                    .font(.body.weight(.medium))
                    .foregroundStyle(.primary)

                Label(food.category, systemImage: FoodCategory.systemImage(for: food.category))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 8)

            LevelBadge(level: food.level, compact: true)
        }
        .padding(.vertical, 4)
    }
}
