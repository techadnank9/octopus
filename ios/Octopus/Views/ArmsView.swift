import SwiftUI

struct ArmsView: View {
    let shopId: String

    @State private var counts: [Double] = []
    @State private var pulsing: Set<Int> = []
    @State private var errorMessage: String?

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
                        ArmRow(
                            number: index + 1, title: title, value: value(at: index),
                            isPulsing: pulsing.contains(index))
                    }
                    if let errorMessage {
                        Text(errorMessage)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
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
                do {
                    for try await latest in ConvexService.shared.armCounts(shopId: shopId).values {
                        receive(latest)
                    }
                } catch {
                    errorMessage = error.plainMessage
                }
            }
        }
    }

    /// Rows whose counter changed pulse briefly. The first load does not pulse.
    private func receive(_ latest: [Double]) {
        let changed = Set(latest.indices.filter { $0 < counts.count && counts[$0] != latest[$0] })
        counts = latest
        guard !changed.isEmpty else { return }
        pulsing.formUnion(changed)
        Task {
            try? await Task.sleep(for: .seconds(0.8))
            pulsing.subtract(changed)
        }
    }

    private func value(at index: Int) -> String {
        if index == Self.arms.count - 1 { return "Soon" }
        return String(Int(index < counts.count ? counts[index] : 0))
    }
}
