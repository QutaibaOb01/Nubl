import UIKit
import AVFoundation
import UserNotifications

/// نُبل — iOS entry point. The interface is the same web app used on Android,
/// hosted in a WKWebView, with native notifications, audio, location and compass.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var window: UIWindow?
    let web = WebViewController()

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Keep Quran recitation playing with the screen locked or the app in the background.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [])
        UNUserNotificationCenter.current().delegate = self

        let w = UIWindow(frame: UIScreen.main.bounds)
        w.backgroundColor = UIColor(red: 11.0 / 255.0, green: 61.0 / 255.0, blue: 46.0 / 255.0, alpha: 1.0)
        w.rootViewController = web
        w.makeKeyAndVisible()
        window = w
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        web.js("window.NublBridge&&NublBridge.onResume&&NublBridge.onResume()")
        web.refreshNotificationStatus()
    }

    func applicationWillResignActive(_ application: UIApplication) {
        web.js("window.NublBridge&&NublBridge.onPause&&NublBridge.onPause()")
    }

    // Show adhan / reminder notifications even while the app is open.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    // Tapping a notification opens the matching screen (prayers, adhkar, Nabila's page...).
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        if let route = response.notification.request.content.userInfo["r"] as? String {
            web.open(route: route)
        }
        completionHandler()
    }
}
