/**
 * نغمة «حامي» القانونية — ملف WAV حقيقي أولاً، ثم إيقاع مُركَّب إن تعذّر التشغيل.
 * نبرة عميقة (سلطة) → ثنائية شرقية → نداء ذهبي قابل للتمييز من بعيد.
 */

import { HAMI_LEGAL_ALARM_SOUND_WEB } from '@/app/services/notifications/native/hamiNativeSound';

type ChimeStep =
    | { kind: 'tone'; freq: number; duration: number; gain: number; wave?: OscillatorType; detune?: number }
    | { kind: 'pause'; duration: number };

/** توقيع صوتي ثابت للمشروع — يطابق scripts/generate-hami-notification-sound.mjs */
const HAMI_LEGAL_ALARM_SEQUENCE: ChimeStep[] = [
    { kind: 'tone', freq: 146.83, duration: 0.48, gain: 0.58, wave: 'sine' },
    { kind: 'pause', duration: 0.16 },
    { kind: 'tone', freq: 185.0, duration: 0.4, gain: 0.46, wave: 'triangle', detune: 12 },
    { kind: 'tone', freq: 220.0, duration: 0.52, gain: 0.34, wave: 'sine', detune: -8 },
    { kind: 'pause', duration: 0.12 },
    { kind: 'tone', freq: 293.66, duration: 0.62, gain: 0.52, wave: 'sine' },
    { kind: 'tone', freq: 369.99, duration: 0.5, gain: 0.3, wave: 'triangle', detune: 6 },
    { kind: 'pause', duration: 0.18 },
    { kind: 'tone', freq: 440.0, duration: 0.95, gain: 0.44, wave: 'sine' },
    { kind: 'tone', freq: 554.37, duration: 0.72, gain: 0.22, wave: 'sine', detune: 4 },
];

let sharedAudioContext: AudioContext | null = null;
let activePlaybackGeneration = 0;
let webAlarmAudio: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new Ctx();
    }
    return sharedAudioContext;
}

async function ensureAudioRunning(ctx: AudioContext): Promise<void> {
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch {
            /* ignore */
        }
    }
}

function stopWebAlarmAudio(): void {
    if (!webAlarmAudio) return;
    try {
        webAlarmAudio.pause();
        webAlarmAudio.currentTime = 0;
        webAlarmAudio.loop = false;
        webAlarmAudio.src = '';
    } catch {
        /* ignore */
    }
    webAlarmAudio = null;
}

function scheduleTone(
    ctx: AudioContext,
    destination: AudioNode,
    startAt: number,
    step: Extract<ChimeStep, { kind: 'tone' }>,
): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = step.wave ?? 'sine';
    osc.frequency.setValueAtTime(step.freq, startAt);
    if (step.detune) {
        osc.detune.setValueAtTime(step.detune, startAt);
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1_800, startAt);
    filter.Q.setValueAtTime(0.7, startAt);

    const attack = 0.018;
    const release = Math.min(0.35, step.duration * 0.45);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, step.gain), startAt + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + step.duration - release);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(startAt);
    osc.stop(startAt + step.duration + 0.02);
}

function playSequenceOnContext(ctx: AudioContext, destination: AudioNode, startOffset = 0): number {
    let cursor = ctx.currentTime + startOffset;
    for (const step of HAMI_LEGAL_ALARM_SEQUENCE) {
        if (step.kind === 'pause') {
            cursor += step.duration;
            continue;
        }
        scheduleTone(ctx, destination, cursor, step);
        cursor += step.duration;
    }
    return cursor - (ctx.currentTime + startOffset);
}

function vibrateLegalAlarm(): void {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
        navigator.vibrate([180, 90, 180, 90, 320, 120, 420]);
    } catch {
        /* ignore */
    }
}

async function playWebLegalAlarmWav(loop: boolean): Promise<HTMLAudioElement | null> {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    try {
        stopWebAlarmAudio();
        const audio = new Audio(HAMI_LEGAL_ALARM_SOUND_WEB);
        audio.preload = 'auto';
        audio.loop = loop;
        audio.volume = 1;
        await audio.play();
        webAlarmAudio = audio;
        return audio;
    } catch {
        stopWebAlarmAudio();
        return null;
    }
}

export type PlayHamiLegalReminderAlarmOptions = {
    /** تكرار النغمة الكاملة (للمنبه المستمر) — يُستخدم عند سقوط ملف WAV */
    repeats?: number;
    /** فاصل بين التكرارات بالثواني */
    repeatGapSec?: number;
    /** حلقة WAV حتى الإيقاف — منبّه حقيقي داخل التطبيق */
    loop?: boolean;
};

/**
 * يشغّل نغمة التذكير القانونية. يُرجع دالة إيقاف إن كان التكرار مفعّلاً.
 */
export async function playHamiLegalReminderAlarm(
    options: PlayHamiLegalReminderAlarmOptions = {},
): Promise<() => void> {
    const { shouldPlayCalendarAlarmSound, shouldVibrateChannel } = await import(
        '@/app/services/notifications/notificationAlertPolicy'
    );
    if (!shouldPlayCalendarAlarmSound()) {
        return () => undefined;
    }

    const generation = ++activePlaybackGeneration;
    const loop = options.loop === true;

    if (shouldVibrateChannel('calendar', undefined, true)) {
        vibrateLegalAlarm();
    }

    const wavEl = await playWebLegalAlarmWav(loop);
    if (wavEl && generation === activePlaybackGeneration) {
        return () => {
            if (generation === activePlaybackGeneration) {
                activePlaybackGeneration += 1;
            }
            stopWebAlarmAudio();
        };
    }

    const repeats = Math.max(1, options.repeats ?? 1);
    const repeatGapSec = options.repeatGapSec ?? 0.35;

    const ctx = getAudioContext();
    if (!ctx) return () => undefined;

    await ensureAudioRunning(ctx);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.92, ctx.currentTime);
    master.connect(ctx.destination);

    let cursor = 0;
    for (let i = 0; i < repeats; i += 1) {
        if (generation !== activePlaybackGeneration) break;
        const duration = playSequenceOnContext(ctx, master, cursor);
        cursor += duration + repeatGapSec;
    }

    const stop = () => {
        if (generation === activePlaybackGeneration) {
            activePlaybackGeneration += 1;
        }
        stopWebAlarmAudio();
        try {
            master.disconnect();
        } catch {
            /* ignore */
        }
    };

    const totalMs = Math.ceil(cursor * 1000) + 120;
    const autoStopTimer = window.setTimeout(stop, totalMs);

    return () => {
        window.clearTimeout(autoStopTimer);
        stop();
    };
}

/** إيقاف أي تشغيل جارٍ */
export function stopHamiLegalReminderAlarm(): void {
    activePlaybackGeneration += 1;
    stopWebAlarmAudio();
}

/** يُستدعى من إيماءة المستخدم (تفعيل الجرس) لتفادي حظر الصوت على iOS/Safari */
export async function primeHamiLegalReminderAudio(): Promise<void> {
    const ctx = getAudioContext();
    if (ctx) await ensureAudioRunning(ctx);
    if (typeof Audio === 'undefined') return;
    try {
        const audio = new Audio(HAMI_LEGAL_ALARM_SOUND_WEB);
        audio.preload = 'auto';
        audio.muted = true;
        audio.volume = 0;
        await audio.play().catch(() => undefined);
        audio.pause();
        audio.src = '';
    } catch {
        /* ignore */
    }
}

export function resetHamiLegalReminderAlarmForTests(): void {
    activePlaybackGeneration = 0;
    stopWebAlarmAudio();
    if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
        void sharedAudioContext.close();
    }
    sharedAudioContext = null;
}
