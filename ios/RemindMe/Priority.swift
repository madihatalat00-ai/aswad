import SwiftUI

/// Task importance. Drives the accent color and sort order.
enum Priority: String, Codable, CaseIterable, Identifiable {
    case low
    case medium
    case high

    var id: String { rawValue }

    var label: String {
        rawValue.prefix(1).uppercased() + rawValue.dropFirst()
    }

    /// Accent color shown on the row's leading bar and priority chip.
    var color: Color {
        switch self {
        case .low:    return Color(red: 0.42, green: 0.54, blue: 0.99)
        case .medium: return Color(red: 0.96, green: 0.65, blue: 0.14)
        case .high:   return Color(red: 0.90, green: 0.28, blue: 0.30)
        }
    }

    /// Lower rank sorts first (high before low).
    var sortRank: Int {
        switch self {
        case .high:   return 0
        case .medium: return 1
        case .low:    return 2
        }
    }
}
