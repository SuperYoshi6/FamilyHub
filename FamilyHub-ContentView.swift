import SwiftUI
import WebKit

// MARK: - Main View
struct FamilyHubView: View {
    
    init() {
        print("📦 FamilyHub-Structure wird geladen…")
        print("✅ FamilyHub-Structure wurde gestartet")
    }
    
    var body: some View {
        GeometryReader { geometry in
            WebView(url: URL(string: "https://SuperYoshi6.github.io/FamilyHub/app")!)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .ignoresSafeArea(edges: .all)
                .onAppear {
                    print("📱 FamilyHub-ContentView wird geladen…")
                    print("✅ FamilyHub-ContentView wurde gestartet")
                }
                .overlay(
                    Group {
                        if geometry.size.width >= 768 {
                            RoundedRectangle(cornerRadius: 24)
                                .stroke(Color.gray.opacity(0.1), lineWidth: 1)
                                .padding(8)
                                .shadow(radius: 5)
                        }
                    }
                )
        }
    }
}

// MARK: - WebView
struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.allowsAirPlayForMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.load(URLRequest(url: url))
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        // leer lassen
    }
}
