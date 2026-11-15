import SwiftUI

struct ArmsView: View {
    let shopId: String

    @State private var counts: [Double] = []

    private static let arms = [
        "Takes orders by text",
        "Answers customer questions",
        "Sends the pay link",
        "Remembers every regular",
        "Reads your menu from a photo",
        "Pings you when an order lands",
        "Tells customers when the order is ready",
        "Sends you the day's total at closing",
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    OctopusMascotView(height: 180)
                    ForEach(Array(Self.arms.enumerated()), id: \.offset) { index, title in
                        ArmRow(number: index + 1, title: title, value: value(at: index))
                    }
                    Text("Eight arms. One shop. Zero staff.")
                        .font(Theme.headline)
                        .foregroundStyle(Theme.purple)
                        .padding(.vertical, 16)
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle("Arms")
            .task {
                let latest = ConvexService.shared.armCounts(shopId: shopId)
                    .replaceError(with: [])
                    .values
                for await counts in latest {
                    self.counts = counts
                }
            }
        }
    }

    private func value(at index: Int) -> String {
        if index == Self.arms.count - 1 { return "Soon" }
        return String(Int(index < counts.count ? counts[index] : 0))
    }
}
