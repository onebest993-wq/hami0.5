package iq.hami.legal.notificationsheet

import com.getcapacitor.JSObject
import org.json.JSONArray
import org.json.JSONObject

data class NativeNotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val type: String,
    val isRead: Boolean,
    val createdAt: String,
    val tab: String,
)

data class NativeChannelPrefs(
    val enabled: Boolean,
    val sound: Boolean,
    val push: Boolean,
    val inApp: Boolean,
)

data class HamiNotificationSheetPayload(
    val route: String,
    val activeTab: String,
    val unreadCount: Int,
    val forumCount: Int,
    val systemCount: Int,
    val sessionMuted: Boolean,
    val notifications: List<NativeNotificationItem>,
    val channels: Map<String, NativeChannelPrefs>,
    val channelLabels: Map<String, String>,
    val soundMaster: Boolean,
    val vibrateMaster: Boolean,
) {
    companion object {
        fun fromJSObject(obj: JSObject?): HamiNotificationSheetPayload {
            if (obj == null) return empty()
            val notifications = mutableListOf<NativeNotificationItem>()
            val raw = obj.opt("notifications")
            if (raw is JSONArray) {
                for (i in 0 until raw.length()) {
                    val item = raw.optJSONObject(i) ?: continue
                    notifications.add(
                        NativeNotificationItem(
                            id = item.optString("id", ""),
                            title = item.optString("title", ""),
                            message = item.optString("message", ""),
                            type = item.optString("type", ""),
                            isRead = item.optBoolean("isRead", false),
                            createdAt = item.optString("createdAt", ""),
                            tab = item.optString("tab", "forum"),
                        ),
                    )
                }
            }
            val channels = mutableMapOf<String, NativeChannelPrefs>()
            val channelsObj = obj.opt("channels")
            if (channelsObj is JSONObject) {
                val keys = channelsObj.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val ch = channelsObj.optJSONObject(key) ?: continue
                    channels[key] = NativeChannelPrefs(
                        enabled = ch.optBoolean("enabled", true),
                        sound = ch.optBoolean("sound", true),
                        push = ch.optBoolean("push", true),
                        inApp = ch.optBoolean("inApp", true),
                    )
                }
            }
            val channelLabels = mutableMapOf<String, String>()
            val labelsObj = obj.opt("channelLabels")
            if (labelsObj is JSONObject) {
                val keys = labelsObj.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    channelLabels[key] = labelsObj.optString(key, key)
                }
            }
            return HamiNotificationSheetPayload(
                route = obj.optString("route", "inbox"),
                activeTab = obj.optString("activeTab", "forum"),
                unreadCount = obj.optInt("unreadCount", 0),
                forumCount = obj.optInt("forumCount", 0),
                systemCount = obj.optInt("systemCount", 0),
                sessionMuted = obj.optBoolean("sessionMuted", false),
                notifications = notifications,
                channels = channels,
                channelLabels = channelLabels,
                soundMaster = obj.optBoolean("soundMaster", true),
                vibrateMaster = obj.optBoolean("vibrateMaster", true),
            )
        }

        fun empty() = HamiNotificationSheetPayload(
            route = "inbox",
            activeTab = "forum",
            unreadCount = 0,
            forumCount = 0,
            systemCount = 0,
            sessionMuted = false,
            notifications = emptyList(),
            channels = emptyMap(),
            channelLabels = emptyMap(),
            soundMaster = true,
            vibrateMaster = true,
        )
    }
}
