package iq.hami.legal.boot

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.concurrent.atomic.AtomicReference

/**
 * جسر إقلاع: JS يُعلن الجاهزية → MainActivity يحرّر SplashScreen.
 * بلا polling / evaluateJavascript دوري.
 */
@CapacitorPlugin(name = "HamiBoot")
class HamiBootPlugin : Plugin() {

    companion object {
        private val readyListener = AtomicReference<Runnable?>(null)

        @JvmStatic
        fun setReadyListener(listener: Runnable?) {
            readyListener.set(listener)
        }

        @JvmStatic
        fun clearReadyListener() {
            readyListener.set(null)
        }
    }

    @PluginMethod
    fun notifyReady(call: PluginCall) {
        val listener = readyListener.getAndSet(null)
        activity?.runOnUiThread {
            listener?.run()
            call.resolve()
        } ?: run {
            listener?.run()
            call.resolve()
        }
    }
}
