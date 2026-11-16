import SwiftUI

/// A centred icon, one line and one way forward, for the empty cart and orders tabs.
struct EmptyState: View {
    let symbol: String
    let title: String
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: symbol)
                .font(.system(size: 52, weight: .semibold))
                .foregroundStyle(Theme.purple)
                .accessibilityHidden(true)
            Text(title)
                .font(Theme.title)
                .foregroundStyle(Theme.ink)
            Button(actionTitle, action: action)
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 240)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .screenBackground()
    }
}
