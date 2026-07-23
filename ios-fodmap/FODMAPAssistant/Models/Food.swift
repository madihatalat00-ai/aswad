import SwiftUI

/// How safe a food is on a low-FODMAP diet.
enum FodmapLevel: String, Codable, CaseIterable {
    case low
    case moderate
    case high

    /// Short, friendly verdict shown to the user.
    var title: String {
        switch self {
        case .low: return "Enjoy"
        case .moderate: return "Careful"
        case .high: return "Avoid"
        }
    }

    /// One-line meaning of the verdict.
    var summary: String {
        switch self {
        case .low: return "Low FODMAP — safe in normal servings."
        case .moderate: return "Low FODMAP only in small servings — watch the portion."
        case .high: return "High FODMAP — best avoided during elimination."
        }
    }

    var color: Color {
        switch self {
        case .low: return Color("SafeGreen")
        case .moderate: return Color("CautionAmber")
        case .high: return Color("AvoidRed")
        }
    }

    var systemImage: String {
        switch self {
        case .low: return "checkmark.circle.fill"
        case .moderate: return "exclamationmark.triangle.fill"
        case .high: return "xmark.octagon.fill"
        }
    }

    /// Sort order: safe foods first.
    var sortRank: Int {
        switch self {
        case .low: return 0
        case .moderate: return 1
        case .high: return 2
        }
    }
}

/// A single food entry loaded from the bundled database.
struct Food: Identifiable, Codable, Hashable {
    var name: String
    var category: String
    var level: FodmapLevel
    /// Which FODMAP groups the food contains (e.g. "Fructans", "Lactose").
    var fodmaps: [String]
    /// Portion guidance — the heart of the diet, since many foods are only
    /// safe below a threshold serving.
    var serving: String
    /// Optional tip or low-FODMAP alternative.
    var note: String

    // Stable identity derived from the name so favourites survive relaunches.
    var id: String { name }

    private enum CodingKeys: String, CodingKey {
        case name, category, level, fodmaps, serving, note
    }
}

/// Symbol used for each food category in lists and headers.
enum FoodCategory {
    static func systemImage(for category: String) -> String {
        switch category {
        case "Fruits": return "applelogo"
        case "Vegetables": return "carrot.fill"
        case "Grains & Cereals": return "fork.knife"
        case "Dairy & Alternatives": return "cup.and.saucer.fill"
        case "Protein": return "fish.fill"
        case "Legumes & Pulses": return "leaf.fill"
        case "Nuts & Seeds": return "circle.grid.2x2.fill"
        case "Sweeteners": return "birthday.cake.fill"
        case "Condiments & Sauces": return "drop.fill"
        case "Beverages": return "wineglass.fill"
        case "Herbs & Spices": return "leaf.arrow.triangle.circlepath"
        default: return "square.grid.2x2.fill"
        }
    }
}
