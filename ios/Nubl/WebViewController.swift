import UIKit
import WebKit
import CoreLocation

final class WebViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, CLLocationManagerDelegate {
    private var webView: WKWebView!
    private var loaded = false
    private var pendingRoute: String?
    private var lightIcons = true
    private let locationManager = CLLocationManager()
    private var wantLocation = false
    private var compassOn = false

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return lightIcons ? .lightContent : .darkContent
    }

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: "nubl")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = WKWebsiteDataStore.default()

        let controller = WKUserContentController()
        controller.add(WeakScriptHandler(self), name: "nubl")
        let dark = UITraitCollection.current.userInterfaceStyle == .dark
        let boot = "window.__NUBL_IOS={version:'9.0',dark:\(dark ? "true" : "false"),notif:'denied',route:''};"
        controller.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = controller

        let green = UIColor(red: 11.0 / 255.0, green: 61.0 / 255.0, blue: 46.0 / 255.0, alpha: 1.0)
        let wv = WKWebView(frame: .zero, configuration: config)
        wv.isOpaque = false
        wv.backgroundColor = green
        wv.scrollView.backgroundColor = green
        wv.scrollView.bounces = false
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        wv.allowsBackForwardNavigationGestures = false
        wv.navigationDelegate = self
        wv.uiDelegate = self
        if #available(iOS 16.4, *) {
            wv.isInspectable = false
        }
        webView = wv
        view = wv
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        locationManager.delegate = self
        // RTL app: swipe in from the right edge to go back, like native Arabic apps.
        let edge = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(edgeBack(_:)))
        edge.edges = .right
        view.addGestureRecognizer(edge)
        if let url = URL(string: "nubl://app/index.html") {
            webView.load(URLRequest(url: url))
        }
    }

    @objc private func edgeBack(_ gesture: UIScreenEdgePanGestureRecognizer) {
        if gesture.state == .ended {
            js("window.NublBridge&&NublBridge.onBack&&NublBridge.onBack()")
        }
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        let dark = traitCollection.userInterfaceStyle == .dark
        js("window.NublBridge&&NublBridge.onSystemTheme&&NublBridge.onSystemTheme(\(dark ? "true" : "false"))")
    }

    // MARK: - JS helpers

    func js(_ code: String) {
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(code, completionHandler: nil)
        }
    }

    func open(route: String) {
        guard loaded else { pendingRoute = route; return }
        guard let data = try? JSONSerialization.data(withJSONObject: [route], options: []),
              let arr = String(data: data, encoding: .utf8) else { return }
        js("window.NublBridge&&NublBridge.onRoute&&NublBridge.onRoute(\(arr)[0])")
    }

    private func sendJSON(_ callback: String, _ object: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: object, options: []),
              let json = String(data: data, encoding: .utf8) else { return }
        js("window.NublBridge&&NublBridge.\(callback)&&NublBridge.\(callback)(\(json))")
    }

    func refreshNotificationStatus() {
        Notifier.status { granted in
            self.js("window.NublIOS&&NublIOS.set({notif:'\(granted ? "granted" : "denied")'})")
        }
    }

    // MARK: - Messages from the web app (window.webkit.messageHandlers.nubl)

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else { return }
        let args = body["args"] as? [Any] ?? []
        func str(_ i: Int) -> String { return i < args.count ? (args[i] as? String ?? "") : "" }
        func bool(_ i: Int) -> Bool {
            guard i < args.count else { return false }
            if let b = args[i] as? Bool { return b }
            if let n = args[i] as? NSNumber { return n.boolValue }
            return false
        }

        switch cmd {
        case "haptic":
            haptic(str(0))
        case "share":
            share(str(0))
        case "copy":
            UIPasteboard.general.string = str(0)
        case "openUrl":
            if let url = URL(string: str(0)) { UIApplication.shared.open(url) }
        case "setTheme":
            lightIcons = bool(0)
            setNeedsStatusBarAppearanceUpdate()
            setBackground(hex: str(1))
        case "setBars":
            lightIcons = bool(0)
            setNeedsStatusBarAppearanceUpdate()
        case "keepScreenOn":
            UIApplication.shared.isIdleTimerDisabled = bool(0)
        case "requestLocation":
            requestLocation()
        case "startCompass":
            startCompass()
        case "stopCompass":
            stopCompass()
        case "requestNotif":
            Notifier.request { granted in
                self.js("window.NublIOS&&NublIOS.set({notif:'\(granted ? "granted" : "denied")'});window.NublBridge&&NublBridge.onPermission&&NublBridge.onPermission('notif',\(granted ? "true" : "false"))")
            }
        case "schedule":
            Notifier.schedule(json: str(0))
        case "openSettings":
            if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
        default:
            break
        }
    }

    private func haptic(_ kind: String) {
        switch kind {
        case "success":
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "heavy":
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "light":
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        default:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }
    }

    private func share(_ text: String) {
        let sheet = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        if let pop = sheet.popoverPresentationController {
            pop.sourceView = view
            pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 90, width: 1, height: 1)
        }
        present(sheet, animated: true, completion: nil)
    }

    private func setBackground(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return }
        let color = UIColor(red: CGFloat((v >> 16) & 0xFF) / 255.0,
                            green: CGFloat((v >> 8) & 0xFF) / 255.0,
                            blue: CGFloat(v & 0xFF) / 255.0, alpha: 1.0)
        webView.backgroundColor = color
        webView.scrollView.backgroundColor = color
        view.window?.backgroundColor = color
    }

    // MARK: - Location (prayer times) and compass (qibla)

    private func requestLocation() {
        wantLocation = true
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            wantLocation = false
            sendJSON("onLocation", ["ok": false, "error": CLLocationManager.locationServicesEnabled() ? "denied" : "disabled"])
        default:
            locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
            locationManager.requestLocation()
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            if wantLocation {
                manager.desiredAccuracy = kCLLocationAccuracyKilometer
                manager.requestLocation()
            }
            if compassOn {
                manager.startUpdatingLocation()
                manager.startUpdatingHeading()
            }
        case .denied, .restricted:
            if wantLocation {
                wantLocation = false
                sendJSON("onLocation", ["ok": false, "error": "denied"])
            }
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard wantLocation, let loc = locations.last else { return }
        wantLocation = false
        CLGeocoder().reverseGeocodeLocation(loc, preferredLocale: Locale(identifier: "ar")) { marks, _ in
            var result: [String: Any] = ["ok": true, "lat": loc.coordinate.latitude, "lng": loc.coordinate.longitude]
            if let place = marks?.first {
                if let city = place.locality ?? place.subAdministrativeArea ?? place.administrativeArea { result["city"] = city }
                if let country = place.country { result["country"] = country }
                if let code = place.isoCountryCode { result["cc"] = code }
            }
            self.sendJSON("onLocation", result)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard wantLocation else { return }
        wantLocation = false
        let denied = (error as? CLError)?.code == .denied
        sendJSON("onLocation", ["ok": false, "error": denied ? "denied" : "fail"])
    }

    private func startCompass() {
        guard CLLocationManager.headingAvailable() else { return }
        compassOn = true
        locationManager.headingFilter = 1
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
        if locationManager.authorizationStatus == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        } else {
            locationManager.startUpdatingLocation()
        }
        locationManager.startUpdatingHeading()
    }

    private func stopCompass() {
        compassOn = false
        locationManager.stopUpdatingHeading()
        locationManager.stopUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        guard compassOn else { return }
        let degrees = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
        let accuracy = newHeading.headingAccuracy < 0 ? 0 : (newHeading.headingAccuracy > 25 ? 1 : 3)
        js("window.NublBridge&&NublBridge.onHeading&&NublBridge.onHeading(\(String(format: "%.1f", degrees)),\(accuracy))")
    }

    func locationManagerShouldDisplayHeadingCalibration(_ manager: CLLocationManager) -> Bool {
        return true
    }

    // MARK: - Navigation

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "nubl" || url.scheme == "about" {
            decisionHandler(.allow)
            return
        }
        decisionHandler(.cancel)
        UIApplication.shared.open(url)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded = true
        refreshNotificationStatus()
        if let route = pendingRoute {
            pendingRoute = nil
            open(route: route)
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loaded = false
        webView.reload()
    }
}

/// Avoids a retain cycle between WKUserContentController and the view controller.
final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

/// Serves the bundled web app from nubl://app/… so storage persists like a normal website.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root: URL = (Bundle.main.resourceURL ?? Bundle.main.bundleURL).appendingPathComponent("web", isDirectory: true)

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.standardizedFileURL.path), let data = try? Data(contentsOf: file) else {
            urlSchemeTask.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorFileDoesNotExist, userInfo: nil))
            return
        }
        let headers = ["Content-Type": mimeType(file.pathExtension), "Content-Length": String(data.count), "Cache-Control": "no-cache"]
        if let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers) {
            urlSchemeTask.didReceive(response)
        }
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) { }

    private func mimeType(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "webp": return "image/webp"
        case "jpg", "jpeg": return "image/jpeg"
        case "woff2": return "font/woff2"
        case "ttf": return "font/ttf"
        case "wav": return "audio/wav"
        default: return "application/octet-stream"
        }
    }
}
