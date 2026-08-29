package iq.hami.legal;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.LinearInterpolator;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import iq.hami.legal.boot.HamiBootPlugin;
import iq.hami.legal.notificationsheet.HamiNotificationSheetPlugin;
import iq.hami.legal.privacy.HamiPrivacyGuard;
import iq.hami.legal.privacy.HamiPrivacyPlugin;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * قالب native-ready — يطابق MainActivity الإنتاجي (حدث HamiBoot، طبقة شعار، بلا poll).
 */
public class MainActivity extends BridgeActivity {
    private static final long SAFETY_FAILSAFE_MS = 8_000L;
    private static final int BOOT_OVERLAY_FADE_MS = 150;
    private static final int BOOT_NAVY = Color.parseColor("#0A0F1C");

    private final AtomicBoolean keepSplash = new AtomicBoolean(true);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private View bootOverlay;
    private boolean bootOverlayFading;
    private final Runnable safetyFailsafe =
            () -> {
                keepSplash.set(false);
                fadeAndRemoveBootOverlay();
            };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HamiNotificationSheetPlugin.class);
        registerPlugin(HamiBootPlugin.class);
        registerPlugin(HamiPrivacyPlugin.class);

        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(keepSplash::get);
        splashScreen.setOnExitAnimationListener(provider -> provider.remove());

        HamiBootPlugin.setReadyListener(
                () -> {
                    mainHandler.removeCallbacks(safetyFailsafe);
                    keepSplash.set(false);
                    fadeAndRemoveBootOverlay();
                });

        super.onCreate(savedInstanceState);
        HamiPrivacyGuard.attach(this);
        attachBootOverlay();
        revealSystemBarsFromLaunch();
        tintWebViewNavy();
        mainHandler.postDelayed(safetyFailsafe, SAFETY_FAILSAFE_MS);
    }

    @Override
    public void onUserLeaveHint() {
        HamiPrivacyGuard.onLeaving(this);
        super.onUserLeaveHint();
    }

    @Override
    public void onPause() {
        HamiPrivacyGuard.onLeaving(this);
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        HamiPrivacyGuard.onForeground(this);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            HamiPrivacyGuard.onForeground(this);
        } else {
            HamiPrivacyGuard.onLeaving(this);
        }
    }

    private void attachBootOverlay() {
        bootOverlay = getLayoutInflater().inflate(R.layout.hami_boot_overlay, null);
        addContentView(
                bootOverlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        bootOverlay.post(() -> keepSplash.set(false));
    }

    private int bootOverlayFadeMs() {
        try {
            float scale =
                    Settings.Global.getFloat(
                            getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f);
            if (scale <= 0f) return 0;
        } catch (Throwable ignored) {
            /* المدة الافتراضية */
        }
        return BOOT_OVERLAY_FADE_MS;
    }

    private void fadeAndRemoveBootOverlay() {
        if (bootOverlay == null || bootOverlayFading) return;
        bootOverlayFading = true;
        int fadeMs = bootOverlayFadeMs();
        if (fadeMs <= 0) {
            bootOverlay.setVisibility(View.GONE);
            return;
        }
        bootOverlay
                .animate()
                .alpha(0f)
                .setDuration(fadeMs)
                .setInterpolator(new LinearInterpolator())
                .withEndAction(
                        () -> {
                            if (bootOverlay != null) {
                                bootOverlay.setVisibility(View.GONE);
                            }
                        })
                .start();
    }

    private void revealSystemBarsFromLaunch() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.show(WindowInsetsCompat.Type.statusBars());
        bars.show(WindowInsetsCompat.Type.navigationBars());
        getWindow().setStatusBarColor(BOOT_NAVY);
        getWindow().setNavigationBarColor(BOOT_NAVY);
    }

    private void tintWebViewNavy() {
        Bridge bridge = getBridge();
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        webView.setBackgroundColor(BOOT_NAVY);
        View parent = (View) webView.getParent();
        if (parent != null) parent.setBackgroundColor(BOOT_NAVY);
    }

    @Override
    public void onStart() {
        super.onStart();
        revealSystemBarsFromLaunch();
        tintWebViewNavy();
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacks(safetyFailsafe);
        if (bootOverlay != null) {
            bootOverlay.animate().cancel();
        }
        HamiBootPlugin.clearReadyListener();
        super.onDestroy();
    }
}
