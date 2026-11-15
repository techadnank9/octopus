import SwiftUI

struct WelcomeView: View {
    @ObservedObject var store: AppStore

    @State private var name = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    @State private var showsCode = false
    @State private var code = ""
    @State private var isClaiming = false
    @State private var claimError: String?

    private static let codeLength = 6

    private var canClaim: Bool {
        code.count == Self.codeLength && !isClaiming
    }

    private var canContinue: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSaving
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                OctopusMascotView()
                Text("Run your shop by text")
                    .font(Theme.largeTitle)
                    .multilineTextAlignment(.center)
                Text("Eight arms. One shop. Zero staff.")
                    .font(Theme.body)
                    .opacity(0.7)
                field("Shop name", text: $name)
                if let errorMessage {
                    Text(errorMessage)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.coral)
                }
                Button(isSaving ? "Setting up" : "Set up my shop") { createShop() }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!canContinue)
                    .opacity(canContinue ? 1 : 0.5)
                if showsCode {
                    field("Code from the website", text: $code)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .onChange(of: code) { _, value in
                            let cleaned = String(value.uppercased().filter { !$0.isWhitespace }.prefix(Self.codeLength))
                            if cleaned != value { code = cleaned }
                        }
                    if let claimError {
                        Text(claimError)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
                    }
                    Button(isClaiming ? "Opening" : "Open my shop") { claimShop() }
                        .buttonStyle(PrimaryButtonStyle())
                        .disabled(!canClaim)
                        .opacity(canClaim ? 1 : 0.5)
                } else {
                    Button("I set up on the web") { showsCode = true }
                        .font(Theme.body)
                        .frame(minHeight: 44)
                }
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
                try await store.createShop(name: name)
            } catch {
                errorMessage = error.plainMessage
            }
            isSaving = false
        }
    }

    private func claimShop() {
        isClaiming = true
        claimError = nil
        Task {
            do {
                try await store.claimShop(code: code)
            } catch {
                claimError = error.plainMessage
            }
            isClaiming = false
        }
    }
}
