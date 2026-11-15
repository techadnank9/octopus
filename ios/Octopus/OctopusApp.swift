import SwiftUI

@main
struct OctopusApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .tint(Theme.purple)
                .preferredColorScheme(.light)
        }
    }
}
