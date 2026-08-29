package iq.hami.legal.privacy

import android.app.Activity
import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import java.util.concurrent.atomic.AtomicInteger

/**
 * حماية نافذة أندرويد قبل أي JS:
 * FLAG_SECURE يمنع لقطة الشاشة ومعاينة المهام على النظام،
 * والغطاء الأصلي يُرسَم في onUserLeaveHint قبل أن يلتقط النظام الصورة.
 */
object HamiPrivacyGuard {
    private const val PREFS = "hami_privacy_guard"
    private const val KEY_SECURE = "window_secure"
    private const val KEY_COVER = "recents_cover"
    private const val OVERLAY_TAG = "hami_privacy_recents_cover"
    private const val NAVY = 0xFF0A0F1C.toInt()

    private val sensitivePromptDepth = AtomicInteger(0)

    @JvmStatic
    fun attach(activity: Activity) {
        applyWindowSecure(activity, isWindowSecure(activity))
        ensureOverlay(activity)
        if (activity.hasWindowFocus()) {
            hideOverlay(activity)
        }
    }

    @JvmStatic
    fun setGuard(activity: Activity, recentsCover: Boolean, windowSecure: Boolean) {
        prefs(activity)
            .edit()
            .putBoolean(KEY_COVER, recentsCover)
            .putBoolean(KEY_SECURE, windowSecure)
            .apply()
        applyWindowSecure(activity, windowSecure)
        ensureOverlay(activity)
        if (!recentsCover || activity.hasWindowFocus()) {
            hideOverlay(activity)
        }
    }

    @JvmStatic
    fun beginSensitivePrompt() {
        sensitivePromptDepth.incrementAndGet()
    }

    @JvmStatic
    fun endSensitivePrompt(activity: Activity?) {
        sensitivePromptDepth.updateAndGet { depth -> if (depth <= 0) 0 else depth - 1 }
        if (activity != null && activity.hasWindowFocus()) {
            hideOverlay(activity)
        }
    }

    @JvmStatic
    fun onLeaving(activity: Activity) {
        if (!isRecentsCover(activity)) return
        showOverlay(activity)
    }

    @JvmStatic
    fun onForeground(activity: Activity) {
        hideOverlay(activity)
        applyWindowSecure(activity, isWindowSecure(activity))
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun isWindowSecure(context: Context) = prefs(context).getBoolean(KEY_SECURE, true)

    private fun isRecentsCover(context: Context) = prefs(context).getBoolean(KEY_COVER, true)

    private fun applyWindowSecure(activity: Activity, enabled: Boolean) {
        val window = activity.window ?: return
        if (enabled) {
            window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }

    private fun ensureOverlay(activity: Activity): View {
        val root = activity.findViewById<ViewGroup>(android.R.id.content)
        val existing = root.findViewWithTag<View>(OVERLAY_TAG)
        if (existing != null) return existing
        val overlay =
            View(activity).apply {
                tag = OVERLAY_TAG
                setBackgroundColor(NAVY)
                isClickable = true
                isFocusable = true
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
                elevation = 1_000_000f
                visibility = View.GONE
            }
        root.addView(
            overlay,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
        return overlay
    }

    private fun showOverlay(activity: Activity) {
        val overlay = ensureOverlay(activity)
        overlay.visibility = View.VISIBLE
        overlay.bringToFront()
        overlay.invalidate()
    }

    private fun hideOverlay(activity: Activity) {
        val root = activity.findViewById<ViewGroup>(android.R.id.content) ?: return
        val overlay = root.findViewWithTag<View>(OVERLAY_TAG) ?: return
        overlay.visibility = View.GONE
    }
}
