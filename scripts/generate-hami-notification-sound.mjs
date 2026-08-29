#!/usr/bin/env node
/**
 * يولّد نغمات حامي الحقيقية (PCM WAV 16-bit / 44.1kHz):
 * - hami_arrival.wav — وصول إشعار قصير
 * - hami_legal_alarm.wav — منبّه المواعيد (تسلسل قانوني أطول)
 *
 * المخرجات: android res/raw + public/sounds (+ ios/App/App إن وُجد)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLE_RATE = 44100;

/** يطابق ARRIVAL_CHIME في notificationArrivalSound.ts */
const ARRIVAL_TONES = [
    { freq: 523.25, duration: 0.12, gain: 0.28 },
    { freq: 659.25, duration: 0.16, gain: 0.34 },
    { freq: 783.99, duration: 0.22, gain: 0.26 },
];

/**
 * يطابق HAMI_LEGAL_ALARM_SEQUENCE في calendarReminderAlarmSound.ts
 * (tone | pause) — يُكرَّر مرتين ليبلغ المنبّه ~10 ثوانٍ على نظام التشغيل.
 */
const LEGAL_ALARM_STEPS = [
    { kind: 'tone', freq: 146.83, duration: 0.48, gain: 0.58 },
    { kind: 'pause', duration: 0.16 },
    { kind: 'tone', freq: 185.0, duration: 0.4, gain: 0.46 },
    { kind: 'tone', freq: 220.0, duration: 0.52, gain: 0.34 },
    { kind: 'pause', duration: 0.12 },
    { kind: 'tone', freq: 293.66, duration: 0.62, gain: 0.52 },
    { kind: 'tone', freq: 369.99, duration: 0.5, gain: 0.3 },
    { kind: 'pause', duration: 0.18 },
    { kind: 'tone', freq: 440.0, duration: 0.95, gain: 0.44 },
    { kind: 'tone', freq: 554.37, duration: 0.72, gain: 0.22 },
];

function synthTone(freq, durationSec, gain) {
    const n = Math.floor(SAMPLE_RATE * durationSec);
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const t = i / SAMPLE_RATE;
        const env =
            i < n * 0.08
                ? i / (n * 0.08)
                : i > n * 0.72
                  ? (n - i) / (n * 0.28)
                  : 1;
        samples[i] = Math.sin(2 * Math.PI * freq * t) * gain * env;
    }
    return samples;
}

function silence(durationSec) {
    return new Float32Array(Math.max(0, Math.floor(SAMPLE_RATE * durationSec)));
}

function concat(parts) {
    const merged = new Float32Array(parts.reduce((sum, p) => sum + p.length, 0));
    let offset = 0;
    for (const p of parts) {
        merged.set(p, offset);
        offset += p.length;
    }
    return merged;
}

function encodeWav(floatSamples) {
    const numSamples = floatSamples.length;
    const buffer = Buffer.alloc(44 + numSamples * 2);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(SAMPLE_RATE, 24);
    buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);
    for (let i = 0; i < numSamples; i += 1) {
        const clamped = Math.max(-1, Math.min(1, floatSamples[i]));
        buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
    }
    return buffer;
}

function buildArrival() {
    const parts = [];
    for (let i = 0; i < ARRIVAL_TONES.length; i += 1) {
        const tone = ARRIVAL_TONES[i];
        parts.push(synthTone(tone.freq, tone.duration, tone.gain));
        if (i < ARRIVAL_TONES.length - 1) parts.push(silence(0.04));
    }
    return concat(parts);
}

function buildLegalCycle() {
    const parts = [];
    for (const step of LEGAL_ALARM_STEPS) {
        if (step.kind === 'pause') {
            parts.push(silence(step.duration));
            continue;
        }
        parts.push(synthTone(step.freq, step.duration, step.gain));
    }
    return concat(parts);
}

function buildLegalAlarm() {
    const cycle = buildLegalCycle();
    const gap = silence(0.28);
    return concat([cycle, gap, cycle]);
}

function writeTargets(filename, wav) {
    const targets = [
        path.join(ROOT, 'android/app/src/main/res/raw', filename),
        path.join(ROOT, 'public/sounds', filename),
    ];
    const iosApp = path.join(ROOT, 'ios/App/App');
    if (fs.existsSync(iosApp)) {
        targets.push(path.join(iosApp, filename));
    }
    for (const target of targets) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, wav);
        console.log(`✓ ${path.relative(ROOT, target)} (${wav.length} bytes)`);
    }
}

const arrival = encodeWav(buildArrival());
const legal = encodeWav(buildLegalAlarm());
writeTargets('hami_arrival.wav', arrival);
writeTargets('hami_legal_alarm.wav', legal);
