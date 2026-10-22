import Foundation
import UserNotifications

/// Local notifications for adhan times and reminders. iOS keeps at most 64 pending
/// notifications per app, so the soonest 60 are scheduled; the list is refreshed
/// every time the app is opened.
enum Notifier {
    static func status(_ completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let ok = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
            DispatchQueue.main.async { completion(ok) }
        }
    }

    static func request(_ completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async { completion(granted) }
        }
    }

    static func schedule(json: String) {
        guard let data = json.data(using: .utf8),
              let list = (try? JSONSerialization.jsonObject(with: data, options: [])) as? [[String: Any]] else { return }
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        let now = Date().timeIntervalSince1970 * 1000.0
        let upcoming: [(Double, [String: Any])] = list.compactMap { event -> (Double, [String: Any])? in
            guard let t = (event["t"] as? NSNumber)?.doubleValue, t > now + 5000.0 else { return nil }
            return (t, event)
        }.sorted { $0.0 < $1.0 }

        let calendar = Calendar.current
        for (t, event) in upcoming.prefix(60) {
            let content = UNMutableNotificationContent()
            content.title = event["title"] as? String ?? "نُبل"
            content.body = event["body"] as? String ?? ""
            let isPrayer = (event["ch"] as? String) == "prayer"
            content.sound = isPrayer ? UNNotificationSound(named: UNNotificationSoundName(rawValue: "chime.wav")) : UNNotificationSound.default
            content.userInfo = ["r": event["r"] as? String ?? "home"]
            content.threadIdentifier = isPrayer ? "prayer" : "remind"

            let date = Date(timeIntervalSince1970: t / 1000.0)
            let parts = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
            let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
            let id = "nubl-\(Int64(t))-\(content.threadIdentifier)"
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger), withCompletionHandler: nil)
        }
    }
}
