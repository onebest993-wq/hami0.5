import Capacitor
import UIKit

/// غطاء أصلي لشاشة المهام على iOS — يُرسم عند willResignActive قبل لقطة النظام.
@objc(HamiPrivacyPlugin)
public class HamiPrivacyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HamiPrivacyPlugin"
    public let jsName = "HamiPrivacy"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setGuard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginSensitivePrompt", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endSensitivePrompt", returnType: CAPPluginReturnPromise),
    ]

    private static let coverTag = 0x48A1_1101
    private static var recentsCover = true
    private static var sensitiveDepth = 0

    private var resignObs: NSObjectProtocol?
    private var activeObs: NSObjectProtocol?

    public override func load() {
        resignObs = NotificationCenter.default.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard Self.recentsCover else { return }
            Self.showCover(on: self?.bridge?.viewController)
        }
        activeObs = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Self.hideCover(on: self?.bridge?.viewController)
        }
    }

    deinit {
        if let resignObs { NotificationCenter.default.removeObserver(resignObs) }
        if let activeObs { NotificationCenter.default.removeObserver(activeObs) }
    }

    @objc func setGuard(_ call: CAPPluginCall) {
        let recents = call.getBool("recentsCover") ?? true
        DispatchQueue.main.async {
            Self.recentsCover = recents
            if !recents {
                Self.hideCover(on: self.bridge?.viewController)
            }
            call.resolve()
        }
    }

    @objc func beginSensitivePrompt(_ call: CAPPluginCall) {
        Self.sensitiveDepth += 1
        call.resolve()
    }

    @objc func endSensitivePrompt(_ call: CAPPluginCall) {
        Self.sensitiveDepth = max(0, Self.sensitiveDepth - 1)
        DispatchQueue.main.async {
            if UIApplication.shared.applicationState == .active {
                Self.hideCover(on: self.bridge?.viewController)
            }
            call.resolve()
        }
    }

    private static func showCover(on controller: UIViewController?) {
        guard let host = controller?.view else { return }
        hideCover(on: controller)
        let cover = UIView(frame: host.bounds)
        cover.tag = coverTag
        cover.backgroundColor = UIColor(red: 10 / 255, green: 15 / 255, blue: 28 / 255, alpha: 1)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.isUserInteractionEnabled = true
        host.addSubview(cover)
    }

    private static func hideCover(on controller: UIViewController?) {
        controller?.view.viewWithTag(coverTag)?.removeFromSuperview()
    }
}
