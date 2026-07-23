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

            VStack(alignment: .trailing, spacing: 5) {
                LevelBadge(level: food.level, compact: true)
                Text(food.portion)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 7))
            }
        }
        .padding(.vertical, 4)
    }
}
