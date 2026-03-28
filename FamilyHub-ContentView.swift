import SwiftUI
import WebKit

// MARK: - Main View
struct FamilyHubView: View {
    
    init() {
        print("📦 FamilyHub-Structure wird geladen…")
        print("✅ FamilyHub-Structure wurde gestartet")
    }
    
    var body: some View {
        WebView(url: URL(string: "https://SuperYoshi6.github.io/FamilyHub/app")!)
            .edgesIgnoringSafeArea(.all)
            .onAppear {
                print("📱 FamilyHub-ContentView wird geladen…")
                print("✅ FamilyHub-ContentView wurde gestartet")
            }
    }
}

// MARK: - WebView
struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.load(URLRequest(url: url))
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        // leer lassen
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> 9f6c1a9 (v3.2.1: Pixel-Perfect UI Fix (Header, Navigation & Notification Icons))
