package iq.hami.legal;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends BridgeActivity {
    private static final int SPLASH_POLL_MS = 100;
    private static final int SPLASH_MAX_POLLS = 220;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        final AtomicBoolean keepSplash = new AtomicBoolean(true);
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(keepSplash::get);
        super.onCreate(savedInstanceState);

        final Handler handler = new Handler(Looper.getMainLooper());
        final int[] polls = {0};

        final Runnable releaseSplash = () -> keepSplash.set(false);

        final Runnable[] pollBootRevealed = new Runnable[1];
        pollBootRevealed[0] = new Runnable() {
            @Override
            public void run() {
                if (!keepSplash.get()) return;

                if (getBridge() == null || getBridge().getWebView() == null) {
                    polls[0]++;
                    if (polls[0] >= SPLASH_MAX_POLLS) {
                        releaseSplash.run();
                        return;
                    }
                    handler.postDelayed(pollBootRevealed[0], SPLASH_POLL_MS);
                    return;
                }

                WebView webView = getBridge().getWebView();
                webView.evaluateJavascript(
                    "(function(){try{var d=document.documentElement.dataset;"
                        + "if(d.hamiBootRevealed==='1'||d.hamiAppRuntimeReady==='1')return '1';"
                        + "return '0';}catch(e){return '0';}})()",
                    (ValueCallback<String>) value -> {
                        if (!keepSplash.get()) return;
                        if ("\"1\"".equals(value) || "'1'".equals(value) || "1".equals(value)) {
                            releaseSplash.run();
                            return;
                        }
                        polls[0]++;
                        if (polls[0] >= SPLASH_MAX_POLLS) {
                            releaseSplash.run();
                            return;
                        }
                        handler.postDelayed(pollBootRevealed[0], SPLASH_POLL_MS);
                    }
                );
            }
        };

        handler.postDelayed(pollBootRevealed[0], 150);
    }
}
