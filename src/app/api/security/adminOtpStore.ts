import { createHash, randomInt } from 'node:crypto';
import { HQ_STEP_UP_TTL_MS } from '@/app/domain/admin/hqStepUp';
import { applyHqMailerEnvFromFiles } from './adminMailerEnv.ts';
import { getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { isWifeProduction } from './wifeStoreEnv.ts';

const OTP_TTL_MS = 10 * 60 * 1000;
const TRUST_TTL_MS_PROD = 7 * 24 * 60 * 60 * 1000;
const TRUST_TTL_MS_DEV = 30 * 24 * 60 * 60 * 1000;
const CODE_LEN = 6;

function trustTtlMs(): number {
    return isWifeProduction() ? TRUST_TTL_MS_PROD : TRUST_TTL_MS_DEV;
}
const MIN_PEPPER_LEN = 16;
const DEV_OTP_PEPPER = 'hami-admin-otp-dev-pepper';

export function resolveAdminOtpPepper(): string | null {
    applyHqMailerEnvFromFiles();
    const dedicated = (process.env.ADMIN_OTP_PEPPER ?? '').trim();
    if (dedicated.length >= MIN_PEPPER_LEN) return dedicated;
    if (isWifeProduction()) return null;
    const serviceSlice = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().slice(0, 32);
    if (serviceSlice.length >= MIN_PEPPER_LEN) return serviceSlice;
    return DEV_OTP_PEPPER;
}

export function hashAdminOtpCode(code: string): string {
    const p = resolveAdminOtpPepper();
    if (!p) {
        throw new Error('ADMIN_OTP_PEPPER is required');
    }
    return createHash('sha256').update(`${p}:${code.trim()}`, 'utf8').digest('hex');
}

export function generateAdminOtpCode(): string {
    /* 1–9 فقط: الحقل بلا صفر، والرسالة بلا ثمانية — حتى تنعكس الحيلة بلا لبس. */
    let out = '';
    for (let i = 0; i < CODE_LEN; i += 1) {
        out += String(randomInt(1, 10));
    }
    return out;
}

export function isValidDeviceFingerprint(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    return v.length >= 8 && v.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(v);
}

export function deviceFingerprintMatchesRequest(request: Request, bodyFingerprint: string): boolean {
    const header = String(request.headers.get('x-wife-device-id') ?? '').trim();
    if (!header) return !isWifeProduction();
    return header === bodyFingerprint;
}

function otpConfigError(): string {
    return isWifeProduction()
        ? 'Admin OTP is not configured'
        : 'ADMIN_OTP_PEPPER is required (16+ chars) in production; set it even in development';
}

export async function createAdminOtpChallenge(input: {
    userId: string;
    deviceFingerprint: string;
    requestIp?: string | null;
}): Promise<{ code: string; expiresAt: string } | { error: string }> {
    if (!resolveAdminOtpPepper()) {
        return { error: otpConfigError() };
    }

    const admin = getSupabaseAdminClient();
    if (!admin) return { error: 'Database client not configured' };

    const code = generateAdminOtpCode();
    let codeHash: string;
    try {
        codeHash = hashAdminOtpCode(code);
    } catch {
        return { error: otpConfigError() };
    }
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    const nowIso = new Date().toISOString();

    const { error: rotateError } = await admin
        .from('admin_otp_challenges')
        .update({ consumed_at: nowIso })
        .eq('user_id', input.userId)
        .eq('device_fingerprint', input.deviceFingerprint)
        .is('consumed_at', null);
    if (rotateError) {
        const detail = typeof rotateError.message === 'string' ? rotateError.message : '';
        const missing =
            /could not find the table|does not exist|PGRST205|42P01/i.test(detail) ||
            /schema cache/i.test(detail);
        if (missing) {
            return {
                error:
                    'جداول OTP غير موجودة في قاعدة البيانات — طبّق supabase/migrations/20260812000003_admin_otp_trusted_devices.sql',
            };
        }
        return {
            error: isWifeProduction()
                ? 'Failed to create OTP challenge'
                : `Failed to rotate OTP challenge: ${detail || rotateError.code || 'unknown'}`,
        };
    }

    const { error } = await admin.from('admin_otp_challenges').insert({
        user_id: input.userId,
        code_hash: codeHash,
        device_fingerprint: input.deviceFingerprint,
        expires_at: expiresAt,
        request_ip: input.requestIp ?? null,
    });
    if (error) {
        const detail = typeof error.message === 'string' ? error.message : '';
        const missing =
            /could not find the table|does not exist|PGRST205|42P01/i.test(detail) ||
            /schema cache/i.test(detail);
        if (missing) {
            return {
                error:
                    'جداول OTP غير موجودة في قاعدة البيانات — طبّق supabase/migrations/20260812000003_admin_otp_trusted_devices.sql',
            };
        }
        return {
            error: isWifeProduction()
                ? 'Failed to create OTP challenge'
                : `Failed to create OTP challenge: ${detail || error.code || 'unknown'}`,
        };
    }
    return { code, expiresAt };
}

export async function consumeAdminOtpChallenge(input: {
    userId: string;
    deviceFingerprint: string;
    code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!resolveAdminOtpPepper()) {
        return { ok: false, error: 'رمز غير صالح أو منتهٍ' };
    }

    const admin = getSupabaseAdminClient();
    if (!admin) return { ok: false, error: 'Database client not configured' };

    let codeHash: string;
    try {
        codeHash = hashAdminOtpCode(input.code);
    } catch {
        return { ok: false, error: 'رمز غير صالح أو منتهٍ' };
    }
    const nowIso = new Date().toISOString();

    const { data, error } = await admin
        .from('admin_otp_challenges')
        .update({ consumed_at: nowIso })
        .eq('user_id', input.userId)
        .eq('device_fingerprint', input.deviceFingerprint)
        .eq('code_hash', codeHash)
        .is('consumed_at', null)
        .gt('expires_at', nowIso)
        .select('id')
        .maybeSingle();

    if (error || !data?.id) {
        return { ok: false, error: 'رمز غير صالح أو منتهٍ' };
    }
    return { ok: true };
}

export async function burnOpenAdminOtpChallenges(input: {
    userId: string;
    deviceFingerprint: string;
}): Promise<void> {
    const admin = getSupabaseAdminClient();
    if (!admin) return;
    await admin
        .from('admin_otp_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('user_id', input.userId)
        .eq('device_fingerprint', input.deviceFingerprint)
        .is('consumed_at', null);
}

export async function trustAdminDevice(input: {
    userId: string;
    deviceFingerprint: string;
    label?: string;
}): Promise<{ ok: true; expiresAt: string } | { ok: false; error: string }> {
    const admin = getSupabaseAdminClient();
    if (!admin) return { ok: false, error: 'Database client not configured' };

    const expiresAt = new Date(Date.now() + trustTtlMs()).toISOString();
    const nowIso = new Date().toISOString();

    const { error } = await admin.from('admin_trusted_devices').upsert(
        {
            user_id: input.userId,
            device_fingerprint: input.deviceFingerprint,
            label: input.label ?? null,
            trusted_at: nowIso,
            expires_at: expiresAt,
            revoked_at: null,
            last_seen_at: nowIso,
        },
        { onConflict: 'user_id,device_fingerprint' },
    );

    if (error) return { ok: false, error: 'تعذّر توثيق الجهاز' };
    return { ok: true, expiresAt };
}

const DEV_UNLOCK_TRUST_KEY = '__hamiHqDevUnlockTrust';

function getDevUnlockTrustStore(): Map<string, number> {
    const g = globalThis as typeof globalThis & {
        [DEV_UNLOCK_TRUST_KEY]?: Map<string, number>;
    };
    if (!g[DEV_UNLOCK_TRUST_KEY]) {
        g[DEV_UNLOCK_TRUST_KEY] = new Map();
    }
    return g[DEV_UNLOCK_TRUST_KEY];
}

function devUnlockTrustKey(userId: string, deviceFingerprint: string): string {
    return `${userId.trim().toLowerCase()}::${deviceFingerprint.trim()}`;
}

/** ثقة جهاز لاختصار تطوير المقر — لا تعمل في الإنتاج. */
export function grantDevHeadquartersDeviceTrust(userId: string, deviceFingerprint: string): string {
    const expiresAt = new Date(Date.now() + trustTtlMs()).toISOString();
    if (isWifeProduction()) return expiresAt;
    getDevUnlockTrustStore().set(devUnlockTrustKey(userId, deviceFingerprint), Date.now() + trustTtlMs());
    return expiresAt;
}

export function clearDevHeadquartersDeviceTrust(userId: string, deviceFingerprint: string): void {
    getDevUnlockTrustStore().delete(devUnlockTrustKey(userId, deviceFingerprint));
}

export function resetDevHeadquartersDeviceTrustForTests(): void {
    getDevUnlockTrustStore().clear();
}

function hasDevHeadquartersDeviceTrust(userId: string, deviceFingerprint: string): boolean {
    if (isWifeProduction()) return false;
    const expiresAt = getDevUnlockTrustStore().get(devUnlockTrustKey(userId, deviceFingerprint));
    return Boolean(expiresAt && expiresAt > Date.now());
}

export async function isAdminDeviceTrusted(input: {
    userId: string;
    deviceFingerprint: string;
}): Promise<boolean> {
    if (hasDevHeadquartersDeviceTrust(input.userId, input.deviceFingerprint)) return true;
    const admin = getSupabaseAdminClient();
    if (!admin) return false;
    const nowIso = new Date().toISOString();

    const { data, error } = await admin
        .from('admin_trusted_devices')
        .select('id')
        .eq('user_id', input.userId)
        .eq('device_fingerprint', input.deviceFingerprint)
        .is('revoked_at', null)
        .gt('expires_at', nowIso)
        .limit(1)
        .maybeSingle();

    const row = Array.isArray(data) ? data[0] : data;
    const rowId = row && typeof row === 'object' ? String((row as { id?: unknown }).id ?? '').trim() : '';
    if (error || !rowId) return false;

    void admin
        .from('admin_trusted_devices')
        .update({ last_seen_at: nowIso })
        .eq('id', rowId);

    return true;
}

export async function isAdminDeviceStepUpFresh(input: {
    userId: string;
    deviceFingerprint: string;
}): Promise<boolean> {
    if (hasDevHeadquartersDeviceTrust(input.userId, input.deviceFingerprint)) return true;
    const admin = getSupabaseAdminClient();
    if (!admin) return false;
    const nowIso = new Date().toISOString();
    const sinceIso = new Date(Date.now() - HQ_STEP_UP_TTL_MS).toISOString();

    const { data, error } = await admin
        .from('admin_trusted_devices')
        .select('id')
        .eq('user_id', input.userId)
        .eq('device_fingerprint', input.deviceFingerprint)
        .is('revoked_at', null)
        .gt('expires_at', nowIso)
        .gt('trusted_at', sinceIso)
        .limit(1)
        .maybeSingle();

    const row = Array.isArray(data) ? data[0] : data;
    const rowId = row && typeof row === 'object' ? String((row as { id?: unknown }).id ?? '').trim() : '';
    return !error && Boolean(rowId);
}

function isMissingOtpTable(message: string): boolean {
    return (
        /could not find the table|does not exist|PGRST205|42P01/i.test(message) ||
        /schema cache/i.test(message)
    );
}

function fingerprintHint(fingerprint: string): string {
    const raw = fingerprint.trim();
    if (raw.length <= 8) return '••••';
    return `${raw.slice(0, 4)}…${raw.slice(-4)}`;
}

export type HeadquartersTrustedDevice = {
    id: string;
    hint: string;
    label: string | null;
    trustedAt: string;
    expiresAt: string;
    lastSeenAt: string;
    current: boolean;
    expired: boolean;
};

export async function listAdminTrustedDevices(input: {
    userId: string;
    currentFingerprint: string;
}): Promise<HeadquartersTrustedDevice[]> {
    const admin = getSupabaseAdminClient();
    if (!admin) return [];
    const { data, error } = await admin
        .from('admin_trusted_devices')
        .select('id, device_fingerprint, label, trusted_at, expires_at, last_seen_at, revoked_at')
        .eq('user_id', input.userId)
        .is('revoked_at', null)
        .order('last_seen_at', { ascending: false })
        .limit(40);
    if (error) {
        const detail = typeof error.message === 'string' ? error.message : '';
        if (isMissingOtpTable(detail)) return [];
        throw new Error(detail || 'Failed to list trusted devices');
    }
    const now = Date.now();
    const rows: HeadquartersTrustedDevice[] = [];
    for (const raw of Array.isArray(data) ? data : []) {
        const rec = raw as {
            id?: unknown;
            device_fingerprint?: unknown;
            label?: unknown;
            trusted_at?: unknown;
            expires_at?: unknown;
            last_seen_at?: unknown;
        };
        const id = String(rec.id ?? '').trim();
        const fingerprint = String(rec.device_fingerprint ?? '').trim();
        if (!id) continue;
        const expiresAt = String(rec.expires_at ?? '');
        const expired = !expiresAt || new Date(expiresAt).getTime() <= now;
        rows.push({
            id,
            hint: fingerprintHint(fingerprint),
            label: typeof rec.label === 'string' && rec.label.trim() ? rec.label.trim() : null,
            trustedAt: String(rec.trusted_at ?? ''),
            expiresAt,
            lastSeenAt: String(rec.last_seen_at ?? ''),
            current: Boolean(fingerprint) && fingerprint === input.currentFingerprint,
            expired,
        });
    }
    return rows;
}

export async function revokeAdminTrustedDevice(input: {
    userId: string;
    deviceId: string;
}): Promise<'ok' | 'missing'> {
    const admin = getSupabaseAdminClient();
    if (!admin) return 'missing';
    const deviceId = input.deviceId.trim();
    if (!deviceId) return 'missing';
    const { data, error } = await admin
        .from('admin_trusted_devices')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', deviceId)
        .eq('user_id', input.userId)
        .is('revoked_at', null)
        .select('id')
        .maybeSingle();
    if (error) {
        const detail = typeof error.message === 'string' ? error.message : '';
        if (isMissingOtpTable(detail)) return 'missing';
        throw new Error(detail || 'Failed to revoke device');
    }
    return data?.id ? 'ok' : 'missing';
}

export async function revokeAdminTrustedDeviceByFingerprint(input: {
    userId: string;
    deviceFingerprint: string;
}): Promise<'ok' | 'missing'> {
    clearDevHeadquartersDeviceTrust(input.userId, input.deviceFingerprint);
    const admin = getSupabaseAdminClient();
    if (!admin) return 'missing';
    const deviceFingerprint = input.deviceFingerprint.trim();
    if (!isValidDeviceFingerprint(deviceFingerprint)) return 'missing';
    const { data, error } = await admin
        .from('admin_trusted_devices')
        .update({ revoked_at: new Date().toISOString() })
        .eq('device_fingerprint', deviceFingerprint)
        .eq('user_id', input.userId)
        .is('revoked_at', null)
        .select('id')
        .maybeSingle();
    if (error) {
        const detail = typeof error.message === 'string' ? error.message : '';
        if (isMissingOtpTable(detail)) return 'missing';
        throw new Error(detail || 'Failed to revoke current device');
    }
    return data?.id ? 'ok' : 'missing';
}
