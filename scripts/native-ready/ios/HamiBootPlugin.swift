import Capacitor
import UIKit

/// جسر إقلاع iOS: يُظهر طبقة الشعار+الشريط حتى JS يستدعي notifyReady.
@objc(HamiBootPlugin)
public class HamiBootPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HamiBootPlugin"
    public let jsName = "HamiBoot"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "notifyReady", returnType: CAPPluginReturnPromise),
    ]

    private static var overlay: HamiBootOverlayView?
    private static let fadeLock = NSLock()

    public override func load() {
        DispatchQueue.main.async {
            Self.attachOverlay(on: self.bridge?.viewController)
        }
    }

    @objc func notifyReady(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            Self.dismissOverlay()
            call.resolve()
        }
    }

    static func attachOverlay(on controller: UIViewController?) {
        fadeLock.lock()
        defer { fadeLock.unlock() }
        guard overlay == nil, let host = controller?.view else { return }
        let view = HamiBootOverlayView(frame: host.bounds)
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        host.addSubview(view)
        overlay = view
    }

    static func dismissOverlay() {
        fadeLock.lock()
        let view = overlay
        overlay = nil
        fadeLock.unlock()
        view?.fadeOut {}
    }
}
