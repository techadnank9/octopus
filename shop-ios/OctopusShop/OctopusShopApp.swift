import SwiftUI

@main
struct OctopusShopApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .tint(Theme.purple)
                .preferredColorScheme(.light)
        }
    }
}
