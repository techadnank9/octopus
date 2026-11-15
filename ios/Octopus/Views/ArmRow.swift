import SwiftUI

struct ArmRow: View {
    let number: Int
    let title: String
    let value: String
    let isPulsing: Bool

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
                .foregroundStyle(isPulsing ? Theme.coral : Theme.ink)
                .contentTransition(.numericText())
                .animation(.default, value: value)
        }
        .foregroundStyle(Theme.ink)
        .card()
        .overlay {
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .stroke(Theme.coral, lineWidth: 3)
                .opacity(isPulsing ? 1 : 0)
        }
        .scaleEffect(isPulsing ? 1.03 : 1)
        .animation(.spring(response: 0.35, dampingFraction: 0.6), value: isPulsing)
    }
}
