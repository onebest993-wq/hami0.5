package iq.hami.legal.notificationsheet

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.getcapacitor.JSObject

private val Ink = Color(0xFF0B1021)
private val Panel = Color(0xFF0B1021)
private val Gold = Color(0xFFE6C673)
private val Scrim = Color(0xB8010308)

enum class SheetRoute { Inbox, AlertControls }
enum class NotificationTab { Forum, System }
enum class BodyView { Loading, Empty, List }

private fun bodyViewFor(tab: NotificationTab, items: List<NativeNotificationItem>): BodyView {
    val visible = items.filter {
        if (tab == NotificationTab.Forum) it.tab == "forum" else it.tab == "system"
    }
    return when {
        visible.isEmpty() -> BodyView.Empty
        else -> BodyView.List
    }
}

@Composable
fun HamiNotificationSheetScaffold(
    payload: HamiNotificationSheetPayload,
    route: SheetRoute,
    activeTab: NotificationTab,
    onRouteChange: (SheetRoute) -> Unit,
    onTabChange: (NotificationTab) -> Unit,
    onDismiss: () -> Unit,
    onNotificationTap: (NativeNotificationItem) -> Unit,
    onSettingsPatch: (JSObject) -> Unit,
) {
    MaterialTheme(colorScheme = androidx.compose.material3.darkColorScheme()) {
        Box(Modifier.fillMaxSize()) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Scrim)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onDismiss,
                    ),
            )
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .heightIn(max = 640.dp)
                    .navigationBarsPadding()
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)),
                color = Ink,
                tonalElevation = 0.dp,
            ) {
                Column(Modifier.fillMaxWidth()) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp, bottom = 6.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            Modifier
                                .width(36.dp)
                                .height(3.5.dp)
                                .clip(RoundedCornerShape(999.dp))
                                .background(Color.White.copy(0.22f)),
                        )
                    }
                    SheetHeader(
                        route = route,
                        unreadCount = payload.unreadCount,
                        sessionMuted = payload.sessionMuted,
                        onBack = { onRouteChange(SheetRoute.Inbox) },
                        onOpenControls = { onRouteChange(SheetRoute.AlertControls) },
                        onClose = onDismiss,
                    )
                    AnimatedContent(
                        targetState = route,
                        transitionSpec = {
                            fadeIn(tween(180, easing = FastOutSlowInEasing)) togetherWith
                                fadeOut(tween(140, easing = FastOutSlowInEasing))
                        },
                        label = "notification-sheet-route",
                    ) { currentRoute ->
                        when (currentRoute) {
                            SheetRoute.Inbox -> InboxBody(
                                payload = payload,
                                activeTab = activeTab,
                                onTabChange = onTabChange,
                                onNotificationTap = onNotificationTap,
                            )
                            SheetRoute.AlertControls -> AlertControlsBody(
                                payload = payload,
                                onSettingsPatch = onSettingsPatch,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SheetHeader(
    route: SheetRoute,
    unreadCount: Int,
    sessionMuted: Boolean,
    onBack: () -> Unit,
    onOpenControls: () -> Unit,
    onClose: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (route == SheetRoute.AlertControls) {
            HeaderIconButton(label = "رجوع", onClick = onBack) {
                Text("›", fontSize = 20.sp, color = Color.White.copy(0.8f))
            }
            Spacer(Modifier.width(8.dp))
        }
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (route == SheetRoute.AlertControls) "تحكم التنبيهات والصوت" else "الإشعارات",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 17.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (route == SheetRoute.Inbox && unreadCount > 0) {
                    Spacer(Modifier.width(8.dp))
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(Gold)
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(
                            if (unreadCount > 99) "99+" else unreadCount.toString(),
                            color = Ink,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
            if (sessionMuted) {
                Text(
                    "التنبيهات مكتومة مؤقتاً",
                    color = Color.White.copy(0.4f),
                    fontSize = 11.sp,
                    maxLines = 1,
                )
            }
        }
        if (route == SheetRoute.Inbox) {
            HeaderIconButton(label = "تحكم التنبيهات والصوت", onClick = onOpenControls) {
                Text(
                    if (sessionMuted) "كتم" else "صوت",
                    fontSize = 10.sp,
                    color = if (sessionMuted) Gold else Color.White.copy(0.72f),
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
        HeaderIconButton(label = "إغلاق", onClick = onClose) {
            Text("✕", fontSize = 16.sp, color = Color.White.copy(0.55f))
        }
    }
}

@Composable
private fun HeaderIconButton(
    label: String,
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    Box(
        Modifier
            .size(44.dp)
            .border(1.dp, Color.White.copy(0.1f), RoundedCornerShape(999.dp))
            .clip(RoundedCornerShape(999.dp))
            .background(Color.Transparent)
            .clickable(
                role = Role.Button,
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(color = Gold.copy(0.35f)),
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

@Composable
private fun InboxBody(
    payload: HamiNotificationSheetPayload,
    activeTab: NotificationTab,
    onTabChange: (NotificationTab) -> Unit,
    onNotificationTap: (NativeNotificationItem) -> Unit,
) {
    Column(Modifier.fillMaxWidth()) {
        TabRow(
            activeTab = activeTab,
            forumCount = payload.forumCount,
            systemCount = payload.systemCount,
            onTabChange = onTabChange,
        )
        val view = bodyViewFor(activeTab, payload.notifications)
        AnimatedContent(
            targetState = activeTab to view,
            transitionSpec = {
                fadeIn(tween(160, easing = FastOutSlowInEasing)) togetherWith
                    fadeOut(tween(120, easing = FastOutSlowInEasing))
            },
            label = "notification-tab-body",
        ) { (tab, bodyView) ->
            when (bodyView) {
                BodyView.Empty -> EmptyState(tab)
                BodyView.List -> {
                    val items = payload.notifications.filter {
                        if (tab == NotificationTab.Forum) it.tab == "forum" else it.tab == "system"
                    }
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items.forEach { item ->
                            NotificationRow(item = item, onClick = { onNotificationTap(item) })
                        }
                    }
                }
                BodyView.Loading -> Unit
            }
        }
    }
}

@Composable
private fun TabRow(
    activeTab: NotificationTab,
    forumCount: Int,
    systemCount: Int,
    onTabChange: (NotificationTab) -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White.copy(0.045f))
            .padding(3.dp),
    ) {
        TabChip(
            label = "المنتدى",
            count = forumCount,
            selected = activeTab == NotificationTab.Forum,
            onClick = { onTabChange(NotificationTab.Forum) },
            modifier = Modifier.weight(1f),
        )
        TabChip(
            label = "النظام",
            count = systemCount,
            selected = activeTab == NotificationTab.System,
            onClick = { onTabChange(NotificationTab.System) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun TabChip(
    label: String,
    count: Int,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .height(44.dp)
            .clip(RoundedCornerShape(9.dp))
            .background(if (selected) Gold.copy(0.14f) else Color.Transparent)
            .clickable(
                role = Role.Tab,
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(color = Gold.copy(0.25f)),
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            if (count > 0) "$label ($count)" else label,
            color = if (selected) Color(0xFFF4EAD0) else Color.White.copy(0.48f),
            fontSize = 12.5.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun EmptyState(tab: NotificationTab) {
    val message = if (tab == NotificationTab.Forum) {
        "لا إشعارات منتدى حالياً"
    } else {
        "لا إشعارات نظام حالياً"
    }
    Column(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 220.dp)
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            message,
            color = Color.White.copy(0.42f),
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun NotificationRow(item: NativeNotificationItem, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(if (item.isRead) Color.White.copy(0.03f) else Gold.copy(0.08f))
            .clickable(
                role = Role.Button,
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(color = Gold.copy(0.2f)),
                onClick = onClick,
            )
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                item.title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (item.message.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    item.message,
                    color = Color.White.copy(0.55f),
                    fontSize = 12.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun AlertControlsBody(
    payload: HamiNotificationSheetPayload,
    onSettingsPatch: (JSObject) -> Unit,
) {
    val context = LocalContext.current
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            "عدم الإزعاج",
            color = Color(0xFFF4EAD0).copy(0.82f),
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            MuteChip("كتم حتى موعد…", onClick = {
                val activity = context as? android.app.Activity ?: return@MuteChip
                val cal = java.util.Calendar.getInstance().apply {
                    add(java.util.Calendar.HOUR_OF_DAY, 1)
                }
                android.app.DatePickerDialog(
                    activity,
                    { _, year, month, day ->
                        android.app.TimePickerDialog(
                            activity,
                            { _, hour, minute ->
                                cal.set(year, month, day, hour, minute, 0)
                                cal.set(java.util.Calendar.MILLISECOND, 0)
                                val until = cal.timeInMillis
                                if (until > System.currentTimeMillis() + 30_000L) {
                                    onSettingsPatch(JSObject().apply { put("sessionMuteUntil", until) })
                                }
                            },
                            cal.get(java.util.Calendar.HOUR_OF_DAY),
                            cal.get(java.util.Calendar.MINUTE),
                            true,
                        ).show()
                    },
                    cal.get(java.util.Calendar.YEAR),
                    cal.get(java.util.Calendar.MONTH),
                    cal.get(java.util.Calendar.DAY_OF_MONTH),
                ).show()
            }, modifier = Modifier.weight(1f))
            MuteChip(
                "إلغاء الكتم",
                highlighted = payload.sessionMuted,
                onClick = {
                    onSettingsPatch(JSObject().apply { put("sessionMuteClear", true) })
                },
                modifier = Modifier.weight(1f),
            )
        }
        MasterToggleRow("الصوت العام", payload.soundMaster) {
            onSettingsPatch(JSObject().apply { put("soundMaster", it) })
        }
        MasterToggleRow("الاهتزاز", payload.vibrateMaster) {
            onSettingsPatch(JSObject().apply { put("vibrateMaster", it) })
        }
        Text(
            "القنوات",
            color = Color(0xFFF4EAD0).copy(0.82f),
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
        )
        payload.channels.forEach { (key, prefs) ->
            ChannelCard(
                label = payload.channelLabels[key] ?: key,
                prefs = prefs,
                onPatch = { patch ->
                    val obj = JSObject()
                    obj.put("channel", key)
                    patch.forEach { (k, v) -> obj.put(k, v) }
                    onSettingsPatch(obj)
                },
            )
        }
    }
}

@Composable
private fun MuteChip(
    label: String,
    highlighted: Boolean = false,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .height(44.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (highlighted) Gold.copy(0.12f) else Color.White.copy(0.04f))
            .clickable(
                role = Role.Button,
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(color = Gold.copy(0.25f)),
                onClick = onClick,
            )
            .padding(horizontal = 12.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (highlighted) Gold else Color.White.copy(0.8f),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun MasterToggleRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White.copy(0.03f))
            .clickable { onChange(!checked) }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = Color.White.copy(0.85f), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(if (checked) "مفعّل" else "متوقف", color = if (checked) Gold else Color.White.copy(0.45f), fontSize = 11.sp)
    }
}

@Composable
private fun ChannelCard(
    label: String,
    prefs: NativeChannelPrefs,
    onPatch: (Map<String, Any>) -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Panel.copy(alpha = 0.9f))
            .padding(10.dp),
    ) {
        Text(label, color = Gold.copy(0.9f), fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            MiniToggleChip("صوت", prefs.sound && prefs.enabled, prefs.enabled) {
                onPatch(mapOf("sound" to !prefs.sound))
            }
            MiniToggleChip("إشعار", prefs.push && prefs.enabled, prefs.enabled) {
                onPatch(mapOf("push" to !prefs.push))
            }
            MiniToggleChip("داخل التطبيق", prefs.inApp && prefs.enabled, prefs.enabled) {
                onPatch(mapOf("inApp" to !prefs.inApp))
            }
        }
    }
}

@Composable
private fun RowScope.MiniToggleChip(
    label: String,
    checked: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Box(
        Modifier
            .weight(1f)
            .heightIn(min = 44.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(
                when {
                    !enabled -> Color.White.copy(0.02f)
                    checked -> Gold.copy(0.1f)
                    else -> Color.White.copy(0.03f)
                },
            )
            .clickable(enabled = enabled) { onClick() }
            .padding(horizontal = 12.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = when {
                !enabled -> Color.White.copy(0.3f)
                checked -> Gold
                else -> Color.White.copy(0.55f)
            },
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
    }
}
