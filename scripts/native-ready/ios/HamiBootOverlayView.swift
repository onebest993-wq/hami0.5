import UIKit

/// طبقة إقلاع أصلية بعد LaunchScreen: شعار fit + شريط ذهبي برمجي 3pt.
/// تُزال عند HamiBoot.notifyReady بتلاشٍ ≤150ms — بلا تأخير اصطناعي.
final class HamiBootOverlayView: UIView {
    static let fadeMs: TimeInterval = 0.15

    private let logoView: UIImageView = {
        let view = UIImageView(image: UIImage(named: "LaunchLogo"))
        view.contentMode = .scaleAspectFit
        view.translatesAutoresizingMaskIntoConstraints = false
        view.isAccessibilityElement = false
        return view
    }()

    private let trackLayer = CALayer()
    private let fillLayer = CAGradientLayer()
    private let fillHost = CALayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor(red: 10 / 255, green: 15 / 255, blue: 28 / 255, alpha: 1)
        isAccessibilityElement = true
        accessibilityLabel = "جاري التهيئة"
        accessibilityTraits = .updatesFrequently
        addSubview(logoView)
        NSLayoutConstraint.activate([
            logoView.centerXAnchor.constraint(equalTo: centerXAnchor),
            logoView.centerYAnchor.constraint(equalTo: centerYAnchor),
            logoView.widthAnchor.constraint(equalToConstant: 160),
            logoView.heightAnchor.constraint(equalToConstant: 160),
        ])
        trackLayer.backgroundColor = UIColor(red: 197 / 255, green: 160 / 255, blue: 89 / 255, alpha: 0.2).cgColor
        trackLayer.cornerRadius = 1.5
        layer.addSublayer(trackLayer)
        fillLayer.colors = [
            UIColor(red: 197 / 255, green: 160 / 255, blue: 89 / 255, alpha: 1).cgColor,
            UIColor(red: 212 / 255, green: 175 / 255, blue: 55 / 255, alpha: 1).cgColor,
            UIColor(red: 230 / 255, green: 198 / 255, blue: 115 / 255, alpha: 1).cgColor,
        ]
        fillLayer.startPoint = CGPoint(x: 0, y: 0.5)
        fillLayer.endPoint = CGPoint(x: 1, y: 0.5)
        fillLayer.cornerRadius = 1.5
        fillHost.masksToBounds = true
        fillHost.addSublayer(fillLayer)
        trackLayer.addSublayer(fillHost)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let width: CGFloat = 168
        let height: CGFloat = 3
        trackLayer.frame = CGRect(x: (bounds.width - width) / 2, y: bounds.midY + 108, width: width, height: height)
        fillHost.frame = trackLayer.bounds
        fillLayer.frame = CGRect(x: 0, y: 0, width: width * 0.34, height: height)
        startSweepIfNeeded()
    }

    private func startSweepIfNeeded() {
        guard fillLayer.animation(forKey: "hami-boot-sweep") == nil else { return }
        if UIAccessibility.isReduceMotionEnabled {
            fillLayer.frame.origin.x = 0
            return
        }
        let anim = CABasicAnimation(keyPath: "position.x")
        anim.fromValue = -fillLayer.bounds.width
        anim.toValue = trackLayer.bounds.width + fillLayer.bounds.width
        anim.duration = 1.1
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(name: .linear)
        fillLayer.add(anim, forKey: "hami-boot-sweep")
    }

    func fadeOut(completion: @escaping () -> Void) {
        fillLayer.removeAllAnimations()
        let duration = UIAccessibility.isReduceMotionEnabled ? 0 : Self.fadeMs
        UIView.animate(withDuration: duration, delay: 0, options: .curveLinear, animations: {
            self.alpha = 0
        }, completion: { _ in
            self.removeFromSuperview()
            completion()
        })
    }
}
