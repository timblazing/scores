import UIKit
import WebKit
import Capacitor

/// The web view, tuned to feel less like a browser: no scroll indicators, edge-swipe back.
class ScoresBridgeViewController: CAPBridgeViewController {
    /// Set before the view loads. Tells the page a native tab bar is present so it hides its own.
    var hasNativeTabs = false

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeTabsPlugin())
        if hasNativeTabs {
            webView?.configuration.userContentController.addUserScript(
                WKUserScript(source: "window.__NATIVE_TABS__ = true", injectionTime: .atDocumentStart, forMainFrameOnly: true)
            )
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
        webView?.allowsBackForwardNavigationGestures = true
        webView?.allowsLinkPreview = false
    }

    /// Sends a `nativetab` CustomEvent to the page.
    func send(_ detail: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: detail), let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('nativetab', { detail: \(json) }))")
    }
}

/// System tab bar (Liquid Glass on iOS 26+) over a single shared web view.
/// Each tab owns an empty container; the web view moves into whichever tab is selected,
/// and the page handles routing when it receives `nativetab` events.
@available(iOS 18.0, *)
final class ScoresTabBarController: UITabBarController, UITabBarControllerDelegate {
    // Order must match TABS in src/lib/native.ts.
    private static let pages = [
        ("scores", "Scores", "calendar"),
        ("standings", "Standings", "list.number"),
        ("teams", "Teams", "shield"),
        ("news", "News", "newspaper"),
    ]

    let bridgeVC = ScoresBridgeViewController()
    private var containers: [UIViewController] = []

    init() {
        super.init(nibName: nil, bundle: nil)
        bridgeVC.hasNativeTabs = true
        containers = Self.pages.map { _ in
            let vc = UIViewController()
            vc.view.backgroundColor = .black
            return vc
        }
        var tabs: [UITab] = Self.pages.enumerated().map { i, page in
            UITab(title: page.1, image: UIImage(systemName: page.2), identifier: page.0) { [unowned self] _ in containers[i] }
        }
        // Never actually selected: tapping it opens the page's search sheet.
        tabs.append(UISearchTab { _ in UIViewController() })
        self.tabs = tabs
        delegate = self
        embed(in: containers[0])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        tabBar.tintColor = .white
    }

    override var childForStatusBarStyle: UIViewController? { bridgeVC }
    override var childForStatusBarHidden: UIViewController? { bridgeVC }

    func tabBarController(_ tabBarController: UITabBarController, shouldSelectTab tab: UITab) -> Bool {
        if tab is UISearchTab {
            bridgeVC.send(["search": true])
            return false
        }
        guard let index = Self.pages.firstIndex(where: { $0.0 == tab.identifier }) else { return false }
        let reselect = tab == selectedTab
        if !reselect { embed(in: containers[index]) }
        bridgeVC.send(["index": index, "reselect": reselect])
        return true
    }

    /// Called by the page when in-app navigation lands on another tab's root.
    func select(index: Int) {
        guard containers.indices.contains(index), tabs[index] != selectedTab else { return }
        embed(in: containers[index])
        selectedTab = tabs[index]
    }

    private func embed(in container: UIViewController) {
        guard bridgeVC.parent !== container else { return }
        if bridgeVC.parent != nil {
            bridgeVC.willMove(toParent: nil)
            bridgeVC.view.removeFromSuperview()
            bridgeVC.removeFromParent()
        }
        container.addChild(bridgeVC)
        bridgeVC.view.frame = container.view.bounds
        bridgeVC.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.view.addSubview(bridgeVC.view)
        bridgeVC.didMove(toParent: container)
    }
}

@objc(NativeTabsPlugin)
class NativeTabsPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "NativeTabsPlugin"
    let jsName = "NativeTabs"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "select", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setHidden", returnType: CAPPluginReturnPromise),
    ]

    @objc func select(_ call: CAPPluginCall) {
        let index = call.getInt("index") ?? 0
        DispatchQueue.main.async {
            if #available(iOS 18.0, *) { self.tabController?.select(index: index) }
            call.resolve()
        }
    }

    @objc func setHidden(_ call: CAPPluginCall) {
        let hidden = call.getBool("hidden") ?? false
        DispatchQueue.main.async {
            if #available(iOS 18.0, *) { self.tabController?.setTabBarHidden(hidden, animated: true) }
            call.resolve()
        }
    }

    @available(iOS 18.0, *)
    private var tabController: ScoresTabBarController? {
        bridge?.viewController?.tabBarController as? ScoresTabBarController
    }
}
