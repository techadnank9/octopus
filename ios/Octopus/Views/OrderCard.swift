import SwiftUI

struct OrderCard: View {
    let order: Order
    @ObservedObject var store: OrdersStore

    private var isNew: Bool { order.status == .new }
    private var isPaid: Bool { order.paymentStatus == .paid }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(order.customerName)
                    .font(Theme.title)
                Spacer()
                pill(isPaid ? "Paid" : "Unpaid", color: isPaid ? Theme.purple : Theme.coral)
            }
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(order.lines.enumerated()), id: \.offset) { _, line in
                    Text("\(Int(line.qty)) x \(line.name)")
                        .font(Theme.body)
                }
            }
            if let time = order.requestedTime {
                Text("For \(time)")
                    .font(Theme.caption)
                    .opacity(0.7)
            }
            HStack {
                Text(Money.string(cents: order.totalCents))
                    .font(Theme.headline)
                Spacer()
                Text(statusText)
                    .font(Theme.caption)
                    .foregroundStyle(isNew ? Theme.coral : Theme.ink.opacity(0.7))
            }
            if order.status == .new {
                Button("Accept") { Task { await store.setStatus(order, to: .accepted) } }
                    .buttonStyle(PrimaryButtonStyle())
            } else if order.status == .accepted {
                Button("Ready") { Task { await store.setStatus(order, to: .ready) } }
                    .buttonStyle(PrimaryButtonStyle())
            }
            if !isPaid {
                Button("Mark paid (demo)") { Task { await store.markPaidDemo(order) } }
                    .font(Theme.caption)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
        }
        .foregroundStyle(Theme.ink)
        .card()
        .overlay {
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .stroke(Theme.coral, lineWidth: isNew ? 3 : 0)
        }
    }

    private var statusText: String {
        switch order.status {
        case .new: "New"
        case .accepted: "Accepted"
        case .ready: "Ready"
        case .cancelled: "Cancelled"
        }
    }

    private func pill(_ text: String, color: Color) -> some View {
        Text(text)
            .font(Theme.caption)
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(color, in: Capsule())
    }
}
