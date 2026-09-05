/**
 * نغمة وصول إشعار — ختم حامي الرسمي: قرار عميق ثم خامسة تامة ثم نداء ذهبي.
 * بلا مزمار/اهتزاز نغمي/انزلاق — حتى يبقى التنبيه معروفاً لا مضحكاً.
 */
import type { NotificationChannelKey } from '@/app/services/settings/notificationSettings';
import { HAMI_ARRIVAL_SOUND_WEB } from '@/app/services/notifications/native/hamiNativeSound';
import {
    HAMI_ARRIVAL_GAP_SEC,
    HAMI_ARRIVAL_TONES,
    type HamiArrivalTone,
} from '@/app/services/notifications/native/hamiArrivalChime';
import {
    HAMI_NOTIFICATION_VIBRATE_PATTERN,
    playDeviceHaptic,
} from '@/app/services/platform/deviceHaptic';

let sharedAudioContext: AudioContext | null = null;
let webArrivalAudio: HTMLAudioElement | null = null;
let playbackGeneration = 0;
let lastPlayAtMs = 0;
const MIN_GAP_MS = 900;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new Ctx();
    }
    return sharedAudioContext;
}

async function ensureRunning(ctx: AudioContext): Promise<void> {
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch {
            /* ignore */
        }
    }
}

function scheduleSealTone(
    ctx: AudioContext,
    destination: AudioNode,
    startAt: number,
    step: HamiArrivalTone,
): void {
    const sine = ctx.createOscillator();
    const partial = ctx.createOscillator();
    const sineGain = ctx.createGain();
    const partialGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const out = ctx.createGain();

    sine.type = 'sine';
    partial.type = 'sine';
    sine.frequency.setValueAtTime(step.freq, startAt);
    partial.frequency.setValueAtTime(step.freq * 2, startAt);
    sineGain.gain.setValueAtTime(1, startAt);
    partialGain.gain.setValueAtTime(0.07, startAt);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2_400, startAt);
    filter.Q.setValueAtTime(0.6, startAt);

    const attack = 0.008;
    const release = Math.min(0.22, step.duration * 0.55);
    const peakAt = startAt + attack;
    const fadeAt = startAt + Math.max(attack + 0.05, step.duration - release);
    out.gain.setValueAtTime(0.0001, startAt);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0001, step.gain), peakAt);
    out.gain.exponentialRampToValueAtTime(0.0001, fadeAt);

    sine.connect(sineGain);
    partial.connect(partialGain);
    sineGain.connect(filter);
    partialGain.connect(filter);
    filter.connect(out);
    out.connect(destination);

    sine.start(startAt);
    partial.start(startAt);
    sine.stop(startAt + step.duration + 0.02);
    partial.stop(startAt + step.duration + 0.02);

    if (step.goldFreq) {
        const gold = ctx.createOscillator();
        const goldGain = ctx.createGain();
        gold.type = 'sine';
        gold.frequency.setValueAtTime(step.goldFreq, startAt);
        goldGain.gain.setValueAtTime(0.0001, startAt);
        goldGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, step.goldGain ?? 0.18), peakAt);
        goldGain.gain.exponentialRampToValueAtTime(0.0001, fadeAt);
        gold.connect(goldGain);
        goldGain.connect(destination);
        gold.start(startAt);
        gold.stop(startAt + step.duration + 0.02);
    }
}

function vibrateArrival(): void {
    playDeviceHaptic(HAMI_NOTIFICATION_VIBRATE_PATTERN);
}

async function playWebArrivalWav(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
        const audio = new Audio(HAMI_ARRIVAL_SOUND_WEB);
        audio.preload = 'auto';
        audio.volume = 1;
        webArrivalAudio = audio;
        await audio.play();
        return true;
    } catch {
        return false;
    }
}

async function playSynthArrivalCue(): Promise<void> {
    const ctx = getAudioContext();
    if (!ctx) return;

    await ensureRunning(ctx);
    const generation = ++playbackGeneration;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.85, ctx.currentTime);
    master.connect(ctx.destination);

    let cursor = ctx.currentTime;
    for (let i = 0; i < HAMI_ARRIVAL_TONES.length; i += 1) {
        if (generation !== playbackGeneration) break;
        scheduleSealTone(ctx, master, cursor, HAMI_ARRIVAL_TONES[i]);
        cursor += HAMI_ARRIVAL_TONES[i].duration;
        if (i < HAMI_ARRIVAL_TONES.length - 1) cursor += HAMI_ARRIVAL_GAP_SEC;
    }

    window.setTimeout(() => {
        try {
            master.disconnect();
        } catch {
            /* ignore */
        }
    }, Math.ceil((cursor - ctx.currentTime) * 1000) + 80);
}

/**
 * يشغّل نغمة وصول إن سمحت السياسة. لا يرمي.
 */
export async function playNotificationArrivalCue(
    channel: NotificationChannelKey,
    options?: { critical?: boolean },
): Promise<void> {
    const critical = options?.critical === true;
    const { shouldPlayChannelSound, shouldVibrateChannel } = await import(
        '@/app/services/notifications/notificationAlertPolicy'
    );

    const playSound = shouldPlayChannelSound(channel, undefined, critical);
    const vibrate = shouldVibrateChannel(channel, undefined, critical);
    if (!playSound && !vibrate) return;

    const now = Date.now();
    if (now - lastPlayAtMs < MIN_GAP_MS) return;
    lastPlayAtMs = now;

    if (vibrate) vibrateArrival();
    if (!playSound) return;

    const playedWav = await playWebArrivalWav();
    if (!playedWav) {
        await playSynthArrivalCue();
    }
}

/** يُستدعى من إيماءة المستخدم (فتح تحكم الصوت) لتفادي حظر iOS/Safari */
export async function primeNotificationArrivalAudio(): Promise<void> {
    const ctx = getAudioContext();
    if (ctx) await ensureRunning(ctx);
}

/**
 * تشغيل فوري من إيماءة المستخدم (زر تفعيل / مفتاح الصوت) — يتجاوز السياسة والفاصل.
 * هذا هو المسار الوحيد المضمون لسماع النغمة داخل WebView.
 */
export async function previewNotificationArrivalCue(): Promise<void> {
    lastPlayAtMs = 0;
    vibrateArrival();
    const playedWav = await playWebArrivalWav();
    if (!playedWav) {
        await playSynthArrivalCue();
    }
}

/** معاينة الاهتزاز فقط (مفتاح الاهتزاز) — بدون نغمة */
export function previewNotificationArrivalHaptic(): void {
    vibrateArrival();
}

export function resetNotificationArrivalSoundForTests(): void {
    playbackGeneration = 0;
    lastPlayAtMs = 0;
    webArrivalAudio = null;
    if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
        void sharedAudioContext.close();
    }
    sharedAudioContext = null;
}
