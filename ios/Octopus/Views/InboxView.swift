import SwiftUI

/// The page behind the Customer service tile: every customer conversation, newest trouble first.
struct InboxView: View {
    let shopId: String

    @StateObject private var store: InboxStore

    init(shopId: String) {
        self.shopId = shopId
        _store = StateObject(wrappedValue: InboxStore(shopId: shopId))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let message = store.errorMessage {
                    Text(message)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.coral)
                }
                if store.hasLoaded && store.rows.isEmpty {
                    Text("No conversations yet. Customers who message your shop appear here.")
                        .font(Theme.body)
                        .opacity(0.7)
                }
                // The backend sorts the ones that need the owner first, so both sections keep its order.
                section("Needs you", store.rows.filter(\.needsYou))
                section("All conversations", store.rows.filter { !$0.needsYou })
            }
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
        .screenBackground()
        .navigationTitle("Inbox")
        .navigationBarTitleDisplayMode(.large)
    }

    @ViewBuilder private func section(_ title: String, _ rows: [InboxRow]) -> some View {
        if !rows.isEmpty {
            Text(title)
                .font(Theme.headline)
                .padding(.top, 8)
            VStack(spacing: 0) {
                ForEach(rows) { row in
                    NavigationLink {
                        InboxThreadView(shopId: shopId, row: row)
                    } label: {
                        InboxRowView(row: row)
                    }
                    .buttonStyle(.plain)
                    if row.id != rows.last?.id {
                        Divider().padding(.leading, 74)
                    }
                }
            }
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        }
    }
}

struct InboxRowView: View {
    let row: InboxRow

    private static let avatarColors = [
        Theme.purple, Theme.coral, Theme.ink, Color(.systemTeal), Color(.systemOrange), Color(.systemIndigo),
    ]

    var body: some View {
        HStack(spacing: 12) {
            avatar
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(row.customer)
                        .font(Theme.headline)
                        .lineLimit(1)
                    if row.needsYou, let reason = row.reason {
                        Text(reason)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Theme.coral, in: Capsule())
                    }
                    Spacer(minLength: 4)
                    Text(Self.ago(row.lastAt))
                        .font(Theme.caption)
                        .monospacedDigit()
                        .opacity(0.6)
                        .layoutPriority(1)
                }
                Text(preview)
                    .font(Theme.body)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Image(systemName: "chevron.right")
                .font(Theme.caption)
                .foregroundStyle(.tertiary)
        }
        .foregroundStyle(Theme.ink)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(minHeight: 44)
        .contentShape(Rectangle())
    }

    private var avatar: some View {
        Text(row.customer.trimmingCharacters(in: .whitespaces).prefix(1).uppercased())
            .font(Theme.headline)
            .foregroundStyle(.white)
            .frame(width: 48, height: 48)
            .background(avatarColor, in: Circle())
            .accessibilityHidden(true)
    }

    /// The same customer always gets the same colour.
    private var avatarColor: Color {
        let sum = row.customer.unicodeScalars.reduce(0) { $0 + Int($1.value) }
        return Self.avatarColors[sum % Self.avatarColors.count]
    }

    /// inbox:list does not say whether the shop's last reply was the owner's, so it reads "Octopus".
    private var preview: String {
        row.lastFromCustomer ? row.lastText : "Octopus: \(row.lastText)"
    }

    /// "now", "2 min", "3 h", "5 d", then the date.
    private static func ago(_ milliseconds: Double) -> String {
        let date = Date(timeIntervalSince1970: milliseconds / 1000)
        let minutes = Int(Date().timeIntervalSince(date) / 60)
        if minutes < 1 { return "now" }
        if minutes < 60 { return "\(minutes) min" }
        if minutes < 60 * 24 { return "\(minutes / 60) h" }
        if minutes < 60 * 24 * 7 { return "\(minutes / (60 * 24)) d" }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }
}
