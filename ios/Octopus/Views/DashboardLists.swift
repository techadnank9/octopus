import SwiftUI

/// What is selling today and who the regulars are.
struct DashboardLists: View {
    let dashboard: Dashboard

    private static let sellerLimit = 5

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            heading("Selling today")
            if dashboard.topSellers.isEmpty {
                emptyLine("Nothing sold yet today.")
            } else {
                VStack(spacing: 10) {
                    ForEach(Array(dashboard.topSellers.prefix(Self.sellerLimit).enumerated()), id: \.offset) { _, seller in
                        HStack {
                            Text(seller.name)
                            Spacer()
                            Text("\(Int(seller.qty))")
                                .fontWeight(.bold)
                        }
                        .font(Theme.body)
                    }
                }
                .card()
            }
            heading("Your customers")
            if dashboard.customers.isEmpty {
                emptyLine("Your first customer will show up here.")
            } else {
                ForEach(Array(dashboard.customers.enumerated()), id: \.offset) { _, customer in
                    customerRow(customer)
                }
            }
        }
        .foregroundStyle(Theme.ink)
    }

    private func heading(_ title: String) -> some View {
        Text(title)
            .font(Theme.headline)
            .padding(.top, 8)
    }

    private func emptyLine(_ text: String) -> some View {
        Text(text)
            .font(Theme.body)
            .opacity(0.7)
    }

    private func customerRow(_ customer: Customer) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(customer.name)
                    .font(Theme.headline)
                Spacer()
                Text(Money.string(cents: customer.spentCents))
                    .font(Theme.headline)
            }
            Text(customer.orders == 1 ? "1 order" : "\(Int(customer.orders)) orders")
                .font(Theme.caption)
            if let usual = customer.usual {
                Text("Usual: \(usual)")
                    .font(Theme.caption)
                    .opacity(0.7)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}
