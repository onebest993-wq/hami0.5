/** SHA-256 hex of the normalized entry token. */
export const HEADQUARTERS_DOOR_DIGEST =
    '77a699949072ee8c58b1c6cd72aa65cffb2287f458b9351cf61fc2a831c29ee4';

const DOOR_FAIL_WINDOW_MS = 20_000;
const DOOR_FAIL_MAX = 8;

export const HEADQUARTERS_DOOR_FAIL_WINDOW_MS = DOOR_FAIL_WINDOW_MS;
export const HEADQUARTERS_DOOR_FAIL_MAX = DOOR_FAIL_MAX;

let failCount = 0;
let lockedUntil = 0;

function timingSafeEqualUtf8(left: string, right: string): boolean {
    const a = new TextEncoder().encode(left);
    const b = new TextEncoder().encode(right);
    const maxLen = Math.max(a.length, b.length);
    let diff = a.length ^ b.length;
    for (let i = 0; i < maxLen; i++) {
        diff |= (i < a.length ? a[i] : 0) ^ (i < b.length ? b[i] : 0);
    }
    return diff === 0;
}

export function normalizeHeadquartersDoorPhrase(raw: string): string {
    return String(raw ?? '')
        .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
        .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
        .replace(/[\u06f0-\u06f9]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0))
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

export async function sha256HexUtf8(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function headquartersDoorIsLocked(now = Date.now()): boolean {
    return now < lockedUntil;
}

export function resetHeadquartersDoorLockForTests(): void {
    failCount = 0;
    lockedUntil = 0;
}

/** اختصار تطوير فقط — لا يُقبل إلا إذا مُرّر allowDevShortcut صراحةً. */
export const HEADQUARTERS_DEV_DOOR_TOKEN = '1';

export type HeadquartersDoorMatchOptions = {
    allowDevShortcut?: boolean;
};

export function isHeadquartersDevDoorToken(raw: string): boolean {
    return normalizeHeadquartersDoorPhrase(raw) === HEADQUARTERS_DEV_DOOR_TOKEN;
}

export async function headquartersDoorPhraseMatches(
    raw: string,
    now = Date.now(),
    options?: HeadquartersDoorMatchOptions,
): Promise<boolean> {
    const normalized = normalizeHeadquartersDoorPhrase(raw);
    if (options?.allowDevShortcut === true && normalized === HEADQUARTERS_DEV_DOOR_TOKEN) {
        failCount = 0;
        lockedUntil = 0;
        return true;
    }
    if (headquartersDoorIsLocked(now)) return false;
    if (normalized.length !== HEADQUARTERS_DOOR_DIGEST.length % 51) return false;
    const digest = await sha256HexUtf8(normalized);
    const ok = timingSafeEqualUtf8(digest, HEADQUARTERS_DOOR_DIGEST);
    if (!ok) registerDoorFailure(now);
    else {
        failCount = 0;
        lockedUntil = 0;
    }
    return ok;
}

function registerDoorFailure(now: number): void {
    failCount += 1;
    if (failCount >= DOOR_FAIL_MAX) {
        lockedUntil = now + DOOR_FAIL_WINDOW_MS;
        failCount = 0;
    }
}
