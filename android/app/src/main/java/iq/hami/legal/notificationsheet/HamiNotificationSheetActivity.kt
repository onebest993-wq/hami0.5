package iq.hami.legal.notificationsheet

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall

class HamiNotificationSheetActivity : ComponentActivity() {

    companion object {
        @Volatile
        var pendingPayload: HamiNotificationSheetPayload? = null

        @Volatile
        var pendingCall: PluginCall? = null

        @Volatile
        var dismissRequested: Boolean = false

        fun requestDismiss() {
            dismissRequested = true
        }
    }

    private var finishing = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE,
        )
        enableEdgeToEdge()
        dismissRequested = false
        val payload = pendingPayload ?: HamiNotificationSheetPayload.empty()
        val plugin = HamiNotificationSheetPlugin.instance

        setContent {
            var route by mutableStateOf(
                if (payload.route == "alert-controls") SheetRoute.AlertControls else SheetRoute.Inbox,
            )
            var activeTab by mutableStateOf(
                if (payload.activeTab == "system") NotificationTab.System else NotificationTab.Forum,
            )

            androidx.compose.runtime.LaunchedEffect(dismissRequested) {
                if (dismissRequested) finishSheet()
            }

            HamiNotificationSheetScaffold(
                payload = payload,
                route = route,
                activeTab = activeTab,
                onRouteChange = { next ->
                    route = next
                    plugin?.emitRouteChanged(
                        if (next == SheetRoute.AlertControls) "alert-controls" else "inbox",
                    )
                },
                onTabChange = { activeTab = it },
                onDismiss = { finishSheet() },
                onNotificationTap = { item ->
                    plugin?.emitNotificationTapped(item.id, item.type)
                    finishSheet()
                },
                onSettingsPatch = { patch ->
                    plugin?.emitSettingsPatch(patch)
                },
            )
        }
    }

    private fun finishSheet() {
        if (finishing) return
        finishing = true
        pendingCall?.resolve(JSObject())
        pendingCall = null
        pendingPayload = null
        dismissRequested = false
        HamiNotificationSheetPlugin.instance?.emitDismissed()
        finish()
        @Suppress("DEPRECATION")
        overridePendingTransition(0, 0)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finishSheet()
    }
}
