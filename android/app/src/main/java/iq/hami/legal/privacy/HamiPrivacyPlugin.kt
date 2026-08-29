package iq.hami.legal.privacy

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "HamiPrivacy")
class HamiPrivacyPlugin : Plugin() {

    override fun load() {
        activity?.let { HamiPrivacyGuard.attach(it) }
    }

    @PluginMethod
    fun setGuard(call: PluginCall) {
        val recentsCover = call.getBoolean("recentsCover") ?: true
        val windowSecure = call.getBoolean("windowSecure") ?: true
        val host = activity
        if (host == null) {
            call.reject("No activity")
            return
        }
        host.runOnUiThread {
            HamiPrivacyGuard.setGuard(host, recentsCover, windowSecure)
            call.resolve()
        }
    }

    @PluginMethod
    fun beginSensitivePrompt(call: PluginCall) {
        HamiPrivacyGuard.beginSensitivePrompt()
        call.resolve()
    }

    @PluginMethod
    fun endSensitivePrompt(call: PluginCall) {
        val host = activity
        host?.runOnUiThread {
            HamiPrivacyGuard.endSensitivePrompt(host)
            call.resolve()
        } ?: run {
            HamiPrivacyGuard.endSensitivePrompt(null)
            call.resolve()
        }
    }
}
