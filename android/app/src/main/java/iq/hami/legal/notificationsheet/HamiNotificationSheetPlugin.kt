package iq.hami.legal.notificationsheet

import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "HamiNotificationSheet")
class HamiNotificationSheetPlugin : Plugin() {

    companion object {
        @Volatile
        var instance: HamiNotificationSheetPlugin? = null
    }

    override fun load() {
        super.load()
        instance = this
    }

    override fun handleOnDestroy() {
        if (instance === this) instance = null
        super.handleOnDestroy()
    }

    @PluginMethod
    fun present(call: PluginCall) {
        val activity = activity
        if (activity == null) {
            call.reject("No activity")
            return
        }
        val payload = HamiNotificationSheetPayload.fromJSObject(call.data)
        HamiNotificationSheetActivity.pendingPayload = payload
        HamiNotificationSheetActivity.pendingCall = call

        activity.runOnUiThread {
            val intent = Intent(activity, HamiNotificationSheetActivity::class.java)
            startActivityForResult(call, intent, "sheetFinished")
        }
    }

    @PluginMethod
    fun dismiss(call: PluginCall) {
        activity?.runOnUiThread {
            HamiNotificationSheetActivity.requestDismiss()
            call.resolve()
        } ?: call.reject("No activity")
    }

    fun emitDismissed() {
        notifyListeners("dismissed", JSObject())
    }

    fun emitNotificationTapped(id: String, type: String) {
        val data = JSObject()
        data.put("id", id)
        data.put("type", type)
        notifyListeners("notificationTapped", data)
    }

    fun emitRouteChanged(route: String) {
        val data = JSObject()
        data.put("route", route)
        notifyListeners("routeChanged", data)
    }

    fun emitSettingsPatch(patch: JSObject) {
        notifyListeners("settingsPatch", patch)
    }
}
