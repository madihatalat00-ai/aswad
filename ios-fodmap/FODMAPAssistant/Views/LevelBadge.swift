import SwiftUI

/// Colour-coded pill showing a food's verdict (Enjoy / Careful / Avoid).
struct LevelBadge: View {
    let level: FodmapLevel
    var compact: Bool = false

    var body: some View {
        Label {
            Text(level.title.uppercased())
                .font(.caption2.bold())
                .tracking(0.5)
        } icon: {
            Image(systemName: level.systemImage)
                .font(.caption2)
        }
        .labelStyle(.titleAndIcon)
        .padding(.horizontal, compact ? 8 : 10)
        .padding(.vertical, compact ? 3 : 5)
        .foregroundStyle(.white)
        .background(level.color, in: Capsule())
    }
}

#Preview {
    VStack(spacing: 12) {
        LevelBadge(level: .low)
        LevelBadge(level: .moderate)
        LevelBadge(level: .high)
    }
    .padding()
}
