import SwiftUI

struct ArmRow: View {
    let number: Int
    let title: String
    let value: String

    var body: some View {
        HStack(spacing: 14) {
            Text("\(number)")
                .font(Theme.headline)
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(Theme.purple, in: Circle())
            Text(title)
                .font(Theme.body)
            Spacer()
            Text(value)
                .font(Theme.title)
                .contentTransition(.numericText())
                .animation(.default, value: value)
        }
        .foregroundStyle(Theme.ink)
        .card()
    }
}
