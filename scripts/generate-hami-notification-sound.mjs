#!/usr/bin/env node
/**
 * يولّد نغمات حامي الحقيقية (PCM WAV 16-bit / 44.1kHz):
 * - hami_arrival.wav — ختم وصول رسمي (قرار → خامسة → نداء ذهبي)
 * - hami_legal_alarm.wav — منبّه المواعيد (تسلسل قانوني أطول)
 *
 * المخرجات: android res/raw + public/sounds (+ ios/App/App إن وُجد)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLE_RATE = 44100;

const arrivalSpec = JSON.parse(
    fs.readFileSync(
        path.join(ROOT, 'src/app/services/notifications/native/hamiArrivalChime.json'),
        'utf8',
    ),
);

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

/** ختم رسمي: جيب نقي + توافقي خفيف + طبقة ذهبية اختيارية. بلا مزمار. */
function synthSealTone(freq, durationSec, gain, opts = {}) {
    const n = Math.floor(SAMPLE_RATE * durationSec);
    const samples = new Float32Array(n);
    const attackN = Math.max(1, Math.floor(SAMPLE_RATE * 0.008));
    const releaseStart = Math.floor(n * 0.38);
    const goldFreq = typeof opts.goldFreq === 'number' ? opts.goldFreq : 0;
    const goldGain = typeof opts.goldGain === 'number' ? opts.goldGain : 0;
    for (let i = 0; i < n; i += 1) {
        const t = i / SAMPLE_RATE;
        let env = 1;
        if (i < attackN) env = i / attackN;
        else if (i > releaseStart) env = (n - i) / Math.max(1, n - releaseStart);
        const s = Math.sin(2 * Math.PI * freq * t);
        const h2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.07;
        let sample = (s + h2) * gain * env;
        if (goldFreq > 0 && goldGain > 0) {
            sample += Math.sin(2 * Math.PI * goldFreq * t) * goldGain * env;
        }
        samples[i] = sample;
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
    const tones = arrivalSpec.tones;
    const gap = arrivalSpec.gapSec;
    for (let i = 0; i < tones.length; i += 1) {
        const tone = tones[i];
        parts.push(
            synthSealTone(tone.freq, tone.duration, tone.gain, {
                goldFreq: tone.goldFreq,
                goldGain: tone.goldGain,
            }),
        );
        if (i < tones.length - 1) parts.push(silence(gap));
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
