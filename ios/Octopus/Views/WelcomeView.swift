import SwiftUI

struct WelcomeView: View {
    @ObservedObject var store: AppStore

    @State private var name = ""
    @State private var hours = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var canContinue: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSaving
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                OctopusMascotView()
                Text("Set up your shop")
                    .font(Theme.largeTitle)
                Text("Eight arms. One shop. Zero staff.")
                    .font(Theme.body)
                    .opacity(0.7)
                field("Shop name", text: $name)
                field("Opening hours (optional)", text: $hours)
                if let errorMessage {
                    Text(errorMessage)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.coral)
                }
                Button(isSaving ? "Setting up" : "Continue") { createShop() }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!canContinue)
                    .opacity(canContinue ? 1 : 0.5)
            }
            .foregroundStyle(Theme.ink)
            .padding(24)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func field(_ title: String, text: Binding<String>) -> some View {
        TextField(title, text: text)
            .font(Theme.body)
            .padding(.horizontal, 16)
            .frame(minHeight: Theme.buttonHeight)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func createShop() {
        isSaving = true
        errorMessage = nil
        Task {
            do {
                try await store.createShop(name: name, hours: hours)
            } catch {
                errorMessage = error.localizedDescription
            }
            isSaving = false
        }
    }
}
