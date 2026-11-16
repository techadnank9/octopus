import SwiftUI

/// The page behind a dashboard tile: that function's detail and actions.
struct TileDetailView: View {
    let kind: TileKind
    let dashboard: Dashboard?
    @ObservedObject var store: SuiteStore

    @State private var announcement = ""
    @State private var rate = ""
    @State private var reorderList: String?

    var body: some View {
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
        .navigationBarTitleDisplayMode(.large)
        .alert(store.message ?? "", isPresented: showsMessage) {
            Button("OK") {}
        }
    }

    private var showsMessage: Binding<Bool> {
        Binding(get: { store.message != nil }, set: { if !$0 { store.message = nil } })
    }

    @ViewBuilder private var content: some View {
        switch kind {
        case .service:
            EmptyView() // The dashboard opens InboxView for this tile.
        case .updates:
            note("When you tap Accept or Ready on an order, the customer gets a text straight away.")
        case .sales:
            sales(invoicing: false)
        case .receipts:
            sales(invoicing: true)
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
            week
        case .inventory:
            reorder
            stockPoints
            note("Change stock in the Menu tab.")
        case .reviews:
            ratings
            action("Reply to all unanswered (\(Int(store.suite?.unanswered ?? 0)))", "replyAll")
            reviews
            action("Ask recent customers for a review", "askReviews")
        case .taxes:
            taxes
        }
    }

    // MARK: Sections

    @ViewBuilder private func sales(invoicing: Bool) -> some View {
        let sales = store.suite?.sales ?? []
        if sales.isEmpty { note("No sales yet today.") }
        ForEach(sales) { sale in
            VStack(alignment: .leading, spacing: 4) {
                titleLine(sale.customer, Money.string(cents: sale.totalCents))
                if let invoice = sale.invoice {
                    Text(invoice)
                        .font(Theme.caption)
                        .monospacedDigit()
                        .foregroundStyle(Theme.purple)
                }
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
                if invoicing {
                    Button("Send invoice") { run("sendInvoice", id: sale.id) }
                        .buttonStyle(PrimaryButtonStyle())
                        .disabled(store.isRunning)
                        .padding(.top, 4)
                }
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
        action("Remind all upcoming bookings", "remindAll")
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
        let audiences = store.suite?.audiences
        row("Everyone you can text", "\(Int(audiences?.all ?? store.suite?.audience.all ?? 0))")
        row("Quiet regulars", "\(Int(audiences?.quiet ?? store.suite?.audience.quiet ?? 0))")
        row("Ordered today", "\(Int(audiences?.today ?? 0))")
        row("Have not paid", "\(Int(audiences?.unpaid ?? 0))")
        Button("Draft a special for me") {
            Task { if let drafted = await store.draft("draftSpecial") { announcement = drafted } }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(store.isRunning)
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

    @ViewBuilder private var week: some View {
        let days = store.suite?.week ?? []
        if !days.isEmpty {
            Text("Last 7 days")
                .font(Theme.headline)
                .padding(.top, 8)
            Grid(alignment: .trailing, horizontalSpacing: 8, verticalSpacing: 10) {
                GridRow {
                    Text("Date").gridColumnAlignment(.leading)
                    Text("Orders")
                    Text("Gross")
                    Text("Tax")
                    Text("Net")
                }
                .opacity(0.7)
                ForEach(days) { day in
                    Divider()
                    GridRow {
                        Text(Self.shortDate(day.date))
                        Text("\(Int(day.orders))")
                        Text(Money.string(cents: day.grossCents))
                        Text(Money.string(cents: day.taxCents))
                        Text(Money.string(cents: day.netCents))
                            .fontWeight(.bold)
                    }
                }
            }
            .font(Theme.caption)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: .infinity)
            .card()
        }
    }

    /// "2026-11-15" becomes "Nov 15". Anything else is shown as it came.
    private static func shortDate(_ text: String) -> String {
        guard let date = try? Date(text, strategy: .iso8601.year().month().day()) else { return text }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }

    @ViewBuilder private var stockPoints: some View {
        let points = store.suite?.stockPoints ?? []
        if !points.isEmpty {
            Text("Stock points")
                .font(Theme.headline)
                .padding(.top, 8)
        }
        ForEach(Array(points.enumerated()), id: \.offset) { _, point in
            HStack {
                Text(point.name)
                    .font(Theme.body)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(Int(point.left)) left")
                        .font(Theme.headline)
                        .foregroundStyle(point.left <= point.point ? Theme.coral : Theme.ink)
                    Text("Reorder at \(Int(point.point))")
                        .font(Theme.caption)
                        .opacity(0.7)
                }
            }
            .card()
        }
        Button("Draft reorder list") {
            Task { if let drafted = await store.draft("draftReorder") { reorderList = drafted } }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(store.isRunning)
        if let reorderList {
            Text(reorderList)
                .font(Theme.body)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .card()
        }
    }

    @ViewBuilder private var ratings: some View {
        let ratings = store.suite?.ratings ?? []
        let most = max(ratings.map(\.count).max() ?? 0, 1)
        if !ratings.isEmpty {
            VStack(spacing: 8) {
                ForEach(Array(ratings.enumerated()), id: \.offset) { _, rating in
                    HStack(spacing: 8) {
                        Text("\(Int(rating.stars)) star\(rating.stars == 1 ? "" : "s")")
                            .frame(width: 64, alignment: .leading)
                        ProgressView(value: rating.count, total: most)
                            .tint(Theme.purple)
                        Text("\(Int(rating.count))")
                            .fontWeight(.bold)
                            .monospacedDigit()
                            .frame(minWidth: 28, alignment: .trailing)
                    }
                    .font(Theme.caption)
                }
            }
            .card()
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
