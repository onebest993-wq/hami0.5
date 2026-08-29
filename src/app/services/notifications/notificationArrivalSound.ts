/**
 * نغمة وصول إشعار داخل التطبيق — أخف من منبّه التقويم، مربوطة بسياسة القنوات.
 */
import type { NotificationChannelKey } from '@/app/services/settings/notificationSettings';
import { HAMI_ARRIVAL_SOUND_WEB } from '@/app/services/notifications/native/hamiNativeSound';

type ChimeStep =
    | { kind: 'tone'; freq: number; duration: number; gain: number; wave?: OscillatorType }
    | { kind: 'pause'; duration: number };

/** نغمة قصيرة مميزة — ليست منبّه تقويم الكامل */
const ARRIVAL_CHIME: ChimeStep[] = [
    { kind: 'tone', freq: 523.25, duration: 0.12, gain: 0.28, wave: 'sine' },
    { kind: 'tone', freq: 659.25, duration: 0.16, gain: 0.34, wave: 'sine' },
    { kind: 'pause', duration: 0.04 },
    { kind: 'tone', freq: 783.99, duration: 0.22, gain: 0.26, wave: 'triangle' },
];

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

function scheduleTone(
    ctx: AudioContext,
    destination: AudioNode,
    startAt: number,
    step: Extract<ChimeStep, { kind: 'tone' }>,
): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = step.wave ?? 'sine';
    osc.frequency.setValueAtTime(step.freq, startAt);
    const attack = 0.012;
    const release = Math.min(0.08, step.duration * 0.4);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, step.gain), startAt + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + step.duration - release);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(startAt);
    osc.stop(startAt + step.duration + 0.02);
}

function vibrateArrival(): void {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
        navigator.vibrate([40, 50, 70]);
    } catch {
        /* ignore */
    }
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
    for (const step of ARRIVAL_CHIME) {
        if (generation !== playbackGeneration) break;
        if (step.kind === 'pause') {
            cursor += step.duration;
            continue;
        }
        scheduleTone(ctx, master, cursor, step);
        cursor += step.duration;
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

export function resetNotificationArrivalSoundForTests(): void {
    playbackGeneration = 0;
    lastPlayAtMs = 0;
    webArrivalAudio = null;
    if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
        void sharedAudioContext.close();
    }
    sharedAudioContext = null;
}
