import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { applyHqMailerEnvFromFiles } from '../../security/adminMailerEnv.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { isWifeProduction } from '../../security/wifeStoreEnv.ts';
import {
    AUTH_OTP_CODE_LEN,
    AUTH_OTP_MAX_ATTEMPTS,
    AUTH_OTP_TTL_MS,
    type AuthOtpChannel,
    type AuthOtpPurpose,
} from './authOtpTypes.ts';

const MIN_PEPPER_LEN = 16;
const DEV_OTP_PEPPER = 'hami-auth-otp-dev-pepper';

function resolveAuthOtpPepper(): string | null {
    applyHqMailerEnvFromFiles();
    const dedicated = (process.env.AUTH_OTP_PEPPER ?? process.env.ADMIN_OTP_PEPPER ?? '').trim();
    if (dedicated.length >= MIN_PEPPER_LEN) return dedicated;
    if (isWifeProduction()) return null;
    const serviceSlice = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().slice(0, 32);
    if (serviceSlice.length >= MIN_PEPPER_LEN) return serviceSlice;
    return DEV_OTP_PEPPER;
}

function hashAuthOtpCode(code: string): string {
    const pepper = resolveAuthOtpPepper();
    if (!pepper) throw new Error('AUTH_OTP_PEPPER is required');
    return createHash('sha256').update(`${pepper}:${code.trim()}`, 'utf8').digest('hex');
}

function hashesEqual(leftHex: string, rightHex: string): boolean {
    try {
        const left = Buffer.from(leftHex, 'hex');
        const right = Buffer.from(rightHex, 'hex');
        if (left.length === 0 || left.length !== right.length) return false;
        return timingSafeEqual(left, right);
    } catch {
        return false;
    }
}

export function generateAuthOtpCode(): string {
    let out = '';
    for (let i = 0; i < AUTH_OTP_CODE_LEN; i += 1) {
        out += String(randomInt(0, 10));
    }
    return out;
}

function pepperError(): string {
    return isWifeProduction()
        ? 'OTP is not configured'
        : 'AUTH_OTP_PEPPER or ADMIN_OTP_PEPPER (16+ chars) is required in production';
}

function isMissingTable(detail: string): boolean {
    return /could not find the table|does not exist|PGRST205|42P01|schema cache/i.test(detail);
}

export async function createAuthOtpChallenge(input: {
    userId: string;
    purpose: AuthOtpPurpose;
    channel: AuthOtpChannel;
    requestIp?: string | null;
}): Promise<{ code: string; expiresAt: string } | { error: string }> {
    if (!resolveAuthOtpPepper()) return { error: pepperError() };
    const admin = getSupabaseAdminClient();
    if (!admin) return { error: 'Database client not configured' };

    const code = generateAuthOtpCode();
    let codeHash: string;
    try {
        codeHash = hashAuthOtpCode(code);
    } catch {
        return { error: pepperError() };
    }
    const expiresAt = new Date(Date.now() + AUTH_OTP_TTL_MS).toISOString();
    const nowIso = new Date().toISOString();

    const { error: rotateError } = await admin
        .from('auth_otp_challenges')
        .update({ consumed_at: nowIso })
        .eq('user_id', input.userId)
        .eq('purpose', input.purpose)
        .is('consumed_at', null);
    if (rotateError) {
        const detail = typeof rotateError.message === 'string' ? rotateError.message : '';
        if (isMissingTable(detail)) {
            return {
                error:
                    'جدول رموز التحقق غير موجود — طبّق supabase/migrations/20260829050000_auth_otp_challenges.sql',
            };
        }
        return { error: isWifeProduction() ? 'Failed to create OTP challenge' : detail };
    }

    const { error } = await admin.from('auth_otp_challenges').insert({
        user_id: input.userId,
        purpose: input.purpose,
        channel: input.channel,
        code_hash: codeHash,
        expires_at: expiresAt,
        request_ip: input.requestIp ?? null,
    });
    if (error) {
        const detail = typeof error.message === 'string' ? error.message : '';
        if (isMissingTable(detail)) {
            return {
                error:
                    'جدول رموز التحقق غير موجود — طبّق supabase/migrations/20260829050000_auth_otp_challenges.sql',
            };
        }
        return { error: isWifeProduction() ? 'Failed to create OTP challenge' : detail };
    }
    return { code, expiresAt };
}

export type ConsumeAuthOtpResult =
    | { ok: true }
    | { ok: false; error: 'invalid' | 'expired' | 'locked' | 'store' };

type AuthOtpAdmin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function readFailedAttemptLock(data: unknown): boolean | null {
    const row = (Array.isArray(data) ? data[0] : data) as { locked?: unknown } | null;
    if (!row || typeof row !== 'object') return null;
    return row.locked === true;
}

/**
 * زيادة المحاولات على الخادم (RPC) أو CAS على الصف. الحساب في Node
 * يفشل تحت التوازي فيسمح بتجاوز السقف.
 */
async function registerFailedAuthOtpAttempt(
    admin: AuthOtpAdmin,
    challengeId: string,
    attempts: number,
): Promise<'invalid' | 'locked' | 'store'> {
    const nextAttempts = attempts + 1;
    const locked = nextAttempts >= AUTH_OTP_MAX_ATTEMPTS;

    if (typeof admin.rpc === 'function') {
        const { data, error } = await admin.rpc('auth_otp_register_failed_attempt', {
            p_id: challengeId,
            p_max: AUTH_OTP_MAX_ATTEMPTS,
        });
        if (!error) {
            const rpcLocked = readFailedAttemptLock(data);
            if (rpcLocked === true) return 'locked';
            if (rpcLocked === false) return 'invalid';
        }
    }

    const patch: Record<string, unknown> = { attempts: nextAttempts };
    if (locked) patch.consumed_at = new Date().toISOString();

    const { data: bumped, error: casError } = await admin
        .from('auth_otp_challenges')
        .update(patch)
        .eq('id', challengeId)
        .eq('attempts', attempts)
        .is('consumed_at', null)
        .select('id')
        .maybeSingle();
    if (casError) return 'store';
    if (!bumped?.id) return 'invalid';
    return locked ? 'locked' : 'invalid';
}

export async function consumeAuthOtpChallenge(input: {
    userId: string;
    purpose: AuthOtpPurpose;
    code: string;
}): Promise<ConsumeAuthOtpResult> {
    if (!resolveAuthOtpPepper()) return { ok: false, error: 'store' };
    const admin = getSupabaseAdminClient();
    if (!admin) return { ok: false, error: 'store' };

    const { data, error } = await admin
        .from('auth_otp_challenges')
        .select('id, code_hash, expires_at, attempts')
        .eq('user_id', input.userId)
        .eq('purpose', input.purpose)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error || !data?.id || typeof data.code_hash !== 'string') {
        return { ok: false, error: 'invalid' };
    }

    const expiresAt = Date.parse(String(data.expires_at ?? ''));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        await admin
            .from('auth_otp_challenges')
            .update({ consumed_at: new Date().toISOString() })
            .eq('id', data.id);
        return { ok: false, error: 'expired' };
    }

    const attempts = typeof data.attempts === 'number' ? data.attempts : 0;
    if (attempts >= AUTH_OTP_MAX_ATTEMPTS) {
        await admin
            .from('auth_otp_challenges')
            .update({ consumed_at: new Date().toISOString() })
            .eq('id', data.id);
        return { ok: false, error: 'locked' };
    }

    let expectedHash: string;
    try {
        expectedHash = hashAuthOtpCode(input.code);
    } catch {
        return { ok: false, error: 'store' };
    }

    if (!hashesEqual(String(data.code_hash), expectedHash)) {
        const outcome = await registerFailedAuthOtpAttempt(admin, String(data.id), attempts);
        if (outcome === 'store') return { ok: false, error: 'store' };
        return { ok: false, error: outcome };
    }

    /*
     * الاستهلاك يجب أن يفوز به طلب واحد فقط: الشرط `consumed_at is null` مع إرجاع
     * الصف المُحدَّث يجعل الطلب المتزامن الثاني لا يجد صفاً فيُرفَض بدل أن يمرّ.
     */
    const { data: consumedRow, error: consumeError } = await admin
        .from('auth_otp_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', data.id)
        .is('consumed_at', null)
        .select('id')
        .maybeSingle();
    if (consumeError) return { ok: false, error: 'store' };
    if (!consumedRow?.id) return { ok: false, error: 'invalid' };
    return { ok: true };
}
