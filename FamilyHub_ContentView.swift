import SwiftUI
import WebKit

// MARK: - Main View
struct FamilyHubView: View {
    var body: some View {
        WebView(url: URL(string: "https://SuperYoshi6.github.io/FamilyHub/app")!)
            .edgesIgnoringSafeArea(.all)
    }
}

// MARK: - WebView
struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true
        webView.backgroundColor = .clear
        webView.isOpaque = false
        
        webView.load(URLRequest(url: url))
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        // NICHTS → verhindert Reload Bug
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            print("🔄 Lädt...")
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("✅ Fertig geladen")
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("❌ Fehler: \(error.localizedDescription)")
        }
    }

}
