import SwiftUI

/// The sheet behind a dashboard tile: that function's detail and actions.
struct TileDetailView: View {
    let kind: TileKind
    let dashboard: Dashboard?
    @ObservedObject var store: SuiteStore

    @Environment(\.dismiss) private var dismiss
    @State private var announcement = ""
    @State private var rate = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text(kind.line)
                        .font(Theme.body)
                        .opacity(0.7)
                    content
                }
                .foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
            }
            .scrollDismissesKeyboard(.interactively)
            .screenBackground()
            .navigationTitle(kind.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .alert(store.message ?? "", isPresented: showsMessage) {
                Button("OK") {}
            }
        }
    }

    private var showsMessage: Binding<Bool> {
        Binding(get: { store.message != nil }, set: { if !$0 { store.message = nil } })
    }

    @ViewBuilder private var content: some View {
        switch kind {
        case .service:
            note("Customers text your shop number and your octopus answers from your menu and hours. "
                + "Anything it cannot answer is passed to you.")
        case .updates:
            note("When you tap Accept or Ready on an order, the customer gets a text straight away.")
        case .sales, .receipts:
            sales
        case .payments:
            row("Collected", Money.string(cents: dashboard?.today.paidCents ?? 0))
            row("Still unpaid", Money.string(cents: dashboard?.today.unpaidCents ?? 0))
            row("Average order", Money.string(cents: dashboard?.today.averageCents ?? 0))
            action("Remind customers who have not paid", "chaseUnpaid")
        case .memory:
            customers
        case .bookings:
            bookings
        case .marketing:
            marketing
        case .bookkeeping:
            sellers
            action("Send me today's total", "dailyTotal")
        case .inventory:
            reorder
            note("Change stock in the Menu tab.")
        case .reviews:
            reviews
            action("Ask recent customers for a review", "askReviews")
        case .taxes:
            taxes
        }
    }

    // MARK: Sections

    @ViewBuilder private var sales: some View {
        let sales = store.suite?.sales ?? []
        if sales.isEmpty { note("No sales yet today.") }
        ForEach(sales) { sale in
            VStack(alignment: .leading, spacing: 4) {
                titleLine(sale.customer, Money.string(cents: sale.totalCents))
                Text(sale.items)
                    .font(Theme.body)
                HStack {
                    Text(Date(timeIntervalSince1970: sale.at / 1000).formatted(date: .omitted, time: .shortened))
                        .opacity(0.7)
                    Spacer()
                    Text(sale.paid ? "Paid" : "Unpaid")
                        .foregroundStyle(sale.paid ? Theme.purple : Theme.coral)
                }
                .font(Theme.caption)
            }
            .card()
        }
    }

    @ViewBuilder private var customers: some View {
        let customers = dashboard?.customers ?? []
        if customers.isEmpty { note("Your first customer will show up here.") }
        ForEach(Array(customers.enumerated()), id: \.offset) { _, customer in
            VStack(alignment: .leading, spacing: 4) {
                titleLine(customer.name, customer.orders == 1 ? "1 order" : "\(Int(customer.orders)) orders")
                Text(customer.usual.map { "Usual: \($0)" } ?? "No usual yet")
                    .font(Theme.caption)
                    .opacity(0.7)
            }
            .card()
        }
    }

    @ViewBuilder private var bookings: some View {
        let bookings = store.suite?.bookings ?? []
        if bookings.isEmpty { note("No bookings yet.") }
        ForEach(bookings) { booking in
            VStack(alignment: .leading, spacing: 8) {
                titleLine(booking.customer, booking.isBooked ? "Booked" : "Cancelled")
                Text("\(booking.service), \(booking.when)")
                    .font(Theme.body)
                if booking.isBooked {
                    HStack(spacing: 12) {
                        Button(booking.reminded ? "Remind again" : "Remind") { run("remind", id: booking.id) }
                            .buttonStyle(PrimaryButtonStyle())
                        Button("Cancel") { run("cancelBooking", id: booking.id) }
                            .buttonStyle(PrimaryButtonStyle(color: Theme.coral))
                    }
                    .disabled(store.isRunning)
                }
            }
            .card()
        }
    }

    @ViewBuilder private var marketing: some View {
        let text = announcement.trimmingCharacters(in: .whitespacesAndNewlines)
        TextField("Today's special", text: $announcement, axis: .vertical)
            .font(Theme.body)
            .lineLimit(2...5)
            .card()
        Button("Send to all") {
            run("announce", text: text)
            announcement = ""
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(text.isEmpty || store.isRunning)
        .opacity(text.isEmpty ? 0.5 : 1)
        action("Win back quiet regulars (\(Int(store.suite?.audience.quiet ?? 0)))", "winback")
        Text("Only people who texted or ordered first are ever messaged.")
            .font(Theme.caption)
            .opacity(0.7)
    }

    @ViewBuilder private var sellers: some View {
        let sellers = dashboard?.topSellers ?? []
        if sellers.isEmpty { note("Nothing sold yet today.") }
        ForEach(Array(sellers.enumerated()), id: \.offset) { _, seller in
            row(seller.name, "\(Int(seller.qty))")
        }
    }

    @ViewBuilder private var reorder: some View {
        let lines = store.suite?.reorder ?? []
        if lines.isEmpty { note("Nothing to reorder.") }
        ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
            row(line.name, "\(Int(line.left)) left")
        }
    }

    @ViewBuilder private var reviews: some View {
        let reviews = store.suite?.reviews ?? []
        if reviews.isEmpty { note("No reviews yet.") }
        ForEach(reviews) { review in
            VStack(alignment: .leading, spacing: 8) {
                titleLine(review.customer, "\(Int(review.rating)) of 5")
                Text(review.text)
                    .font(Theme.body)
                if let reply = review.reply {
                    Text("You replied: \(reply)")
                        .font(Theme.caption)
                        .opacity(0.7)
                } else {
                    Button("Draft and send reply") { run("replyReview", id: review.id) }
                        .buttonStyle(PrimaryButtonStyle())
                        .disabled(store.isRunning)
                }
            }
            .card()
        }
    }

    @ViewBuilder private var taxes: some View {
        let tax = store.suite?.tax
        let newRate = Double(rate.replacingOccurrences(of: ",", with: "."))
        HStack(spacing: 12) {
            TextField("Tax rate, percent (now \((tax?.rate ?? 0).formatted()))", text: $rate)
                .font(Theme.body)
                .keyboardType(.decimalPad)
            Button("Save") {
                run("setTax", rate: newRate)
                rate = ""
            }
            .font(Theme.headline)
            .foregroundStyle(Theme.purple)
            .disabled(newRate == nil || store.isRunning)
        }
        .card()
        row("Gross", Money.string(cents: tax?.grossCents ?? 0))
        row("Tax", Money.string(cents: tax?.taxCents ?? 0))
        row("Net", Money.string(cents: tax?.netCents ?? 0))
    }

    // MARK: Pieces

    private func note(_ text: String) -> some View {
        Text(text)
            .font(Theme.body)
    }

    private func titleLine(_ title: String, _ trailing: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(trailing)
        }
        .font(Theme.headline)
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(Theme.body)
            Spacer()
            Text(value)
                .font(Theme.headline)
        }
        .card()
    }

    private func action(_ title: String, _ name: String) -> some View {
        Button(title) { run(name) }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(store.isRunning)
    }

    private func run(_ name: String, id: String? = nil, text: String? = nil, rate: Double? = nil) {
        Task { await store.run(name, id: id, text: text, rate: rate) }
    }
}
