import SwiftUI
import WebKit

struct FamilyHubView: View {
    let url = URL(string: "https://SuperYoshi6.github.io/FamilyHub/app")!
    
    var body: some View {
        WebView(url: url)
            .edgesIgnoringSafeArea(.all)
    }
}

struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true // Natural feel
        webView.backgroundColor = .clear
        webView.isOpaque = false
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        webView.load(request)
    }
}

// To use in Swift Playgrounds:
// import PlaygroundSupport
// PlaygroundPage.current.setLiveView(FamilyHubView())
