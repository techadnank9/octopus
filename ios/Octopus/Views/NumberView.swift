import SwiftUI

struct NumberView: View {
    let shop: Shop

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let link = shop.channelLink {
                        Text("Text us to order")
                            .font(Theme.largeTitle)
                        QRCodeView(text: link)
                            .frame(maxWidth: 340, maxHeight: 340)
                            .card()
                        Text(SmsLink(link)?.caption ?? link)
                            .font(Theme.headline)
                            .multilineTextAlignment(.center)
                            .textSelection(.enabled)
                        ShareLink(item: link) {
                            Label("Share your shop number", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    } else {
                        Text("Your text line is being set up")
                            .font(Theme.title)
                            .multilineTextAlignment(.center)
                            .padding(.top, 80)
                    }
                }
                .foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity)
                .padding(24)
            }
            .screenBackground()
            .navigationTitle(shop.name)
        }
    }
}
