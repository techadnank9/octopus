import SwiftUI

struct OrderStatusCard: View {
    let order: CustomerOrder
    let startNew: () -> Void

    @Environment(\.openURL) private var openURL

    private static let steps = ["Sent", "Accepted", "Ready"]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Text(headline)
                    .font(Theme.title)
                Spacer()
                Text(order.paid ? "Paid" : "Not paid yet")
                    .font(Theme.caption)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(order.paid ? Theme.purple : Theme.coral, in: Capsule())
            }
            VStack(alignment: .leading, spacing: 2) {
                ForEach(Array(order.lines.enumerated()), id: \.offset) { _, line in
                    Text(line)
                }
                if let time = order.requestedTime, !time.isEmpty {
                    Text("Pickup: \(time)")
                        .foregroundStyle(Theme.ink.opacity(0.6))
                }
            }
            .font(Theme.body)
            Text("Total \(Money.string(cents: order.totalCents))")
                .font(Theme.headline)
            if let step { tracker(step) }
            if order.status == .ready && order.paid {
                Text("Show this screen when you pick up.")
                    .font(Theme.caption)
                    .foregroundStyle(Theme.purple)
            }
            if !order.paid, order.status != .cancelled,
               let link = order.paymentLink, let url = URL(string: link) {
                Button("Pay \(Money.string(cents: order.totalCents))") { openURL(url) }
                    .buttonStyle(PrimaryButtonStyle())
            }
            if order.status == .ready || order.status == .cancelled {
                Button("Start a new order", action: startNew)
                    .font(Theme.headline)
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
        }
        .foregroundStyle(Theme.ink)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    private var headline: String {
        switch order.status {
        case .new: "Order sent to the shop"
        case .accepted: "The shop is on it"
        case .ready: "Your order is ready"
        case .cancelled: "Order cancelled"
        }
    }

    /// Index of the step reached. Nil for a cancelled order, which shows no tracker.
    private var step: Int? {
        switch order.status {
        case .new: 0
        case .accepted: 1
        case .ready: 2
        case .cancelled: nil
        }
    }

    private func tracker(_ reached: Int) -> some View {
        HStack(spacing: 8) {
            ForEach(Array(Self.steps.enumerated()), id: \.offset) { index, title in
                VStack(spacing: 6) {
                    Capsule()
                        .fill(index <= reached ? Theme.purple : Theme.ink.opacity(0.12))
                        .frame(height: 6)
                    Text(title)
                        .font(Theme.caption)
                        .foregroundStyle(index <= reached ? Theme.purple : Theme.ink.opacity(0.5))
                }
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Step \(reached + 1) of 3: \(Self.steps[reached])")
    }
}
