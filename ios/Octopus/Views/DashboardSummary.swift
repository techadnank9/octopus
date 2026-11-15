import SwiftUI

/// Today's numbers and anything that needs the owner's attention.
struct DashboardSummary: View {
    let dashboard: Dashboard

    private static let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible())]

    var body: some View {
        VStack(spacing: 12) {
            LazyVGrid(columns: Self.columns, spacing: 12) {
                tile(String(Int(dashboard.today.orders)), caption: "Orders today")
                tile(Money.string(cents: dashboard.today.paidCents), caption: "Collected")
                tile(Money.string(cents: dashboard.today.unpaidCents), caption: "Still unpaid")
                tile(Money.string(cents: dashboard.today.averageCents), caption: "Average order")
            }
            ForEach(dashboard.alerts, id: \.self) { alert in
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Circle()
                        .fill(Theme.coral)
                        .frame(width: 10, height: 10)
                    Text(alert)
                        .font(Theme.body)
                    Spacer(minLength: 0)
                }
                .card()
            }
        }
        .foregroundStyle(Theme.ink)
    }

    private func tile(_ value: String, caption: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(Theme.largeTitle)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .contentTransition(.numericText())
                .animation(.default, value: value)
            Text(caption)
                .font(Theme.caption)
                .opacity(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
        .accessibilityElement(children: .combine)
    }
}
