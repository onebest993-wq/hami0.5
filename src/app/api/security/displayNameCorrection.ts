import type { SupabaseClient } from '@supabase/supabase-js';
import { getGoTrueAdminApi, getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { isPostgresUuidSubject } from './postgresUuidSubject.ts';
import {
    normalizeLegalDisplayName,
    toDisplayNamePolicy,
    type DisplayNamePolicy,
} from '@/app/domain/profile/displayNameCorrection';

type NameRow = {
    legal_display_name?: unknown;
    previous_legal_display_name?: unknown;
    legal_display_name_corrections?: unknown;
    legal_display_name_corrected_at?: unknown;
};

function isMissingDisplayNameColumn(message: string): boolean {
    const hay = message.toLowerCase();
    return hay.includes('legal_display_name') && (hay.includes('does not exist') || hay.includes('schema cache'));
}

function asText(raw: unknown): string {
    return String(raw ?? '').trim();
}

function asIso(raw: unknown): string | null {
    const text = asText(raw);
    if (!text) return null;
    const at = Date.parse(text);
    return Number.isFinite(at) ? new Date(at).toISOString() : null;
}

function policyFromRow(row: NameRow | null, fallbackName: string): DisplayNamePolicy {
    const fullName = normalizeLegalDisplayName(row?.legal_display_name) || normalizeLegalDisplayName(fallbackName);
    return toDisplayNamePolicy({
        fullName,
        previousFullName: asText(row?.previous_legal_display_name) || null,
        correctedAt: asIso(row?.legal_display_name_corrected_at),
        corrections: Number(row?.legal_display_name_corrections ?? 0),
    });
}

export async function readDisplayNamePolicy(userId: string): Promise<DisplayNamePolicy | null> {
    const id = userId.trim();
    if (!isPostgresUuidSubject(id)) return null;
    const admin = getSupabaseAdminClient();
    if (!admin) return null;
    const fallback = await readAuthFullName(admin, id);
    const { data, error } = await admin
        .from('profiles')
        .select(
            'legal_display_name, previous_legal_display_name, legal_display_name_corrections, legal_display_name_corrected_at',
        )
        .eq('id', id)
        .maybeSingle();
    if (error) {
        if (isMissingDisplayNameColumn(error.message ?? '')) {
            return toDisplayNamePolicy({ fullName: fallback, corrections: 0 });
        }
        return toDisplayNamePolicy({ fullName: fallback, corrections: 0 });
    }
    return policyFromRow((data ?? null) as NameRow | null, fallback);
}

async function readAuthFullName(admin: SupabaseClient, userId: string): Promise<string> {
    try {
        const { data } = await getGoTrueAdminApi(admin).getUserById(userId);
        const meta =
            data?.user?.user_metadata && typeof data.user.user_metadata === 'object'
                ? (data.user.user_metadata as Record<string, unknown>)
                : {};
        return normalizeLegalDisplayName(meta.fullName ?? meta.full_name);
    } catch {
        return '';
    }
}

export async function applyCanonicalDisplayNameToProfileValue(
    userId: string,
    value: unknown,
): Promise<unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const rec = value as Record<string, unknown>;
    const header = rec.header;
    if (!header || typeof header !== 'object' || Array.isArray(header)) return value;
    const policy = await readDisplayNamePolicy(userId);
    const canonical = policy?.fullName?.trim() ?? '';
    if (!canonical) return value;
    return {
        ...rec,
        header: { ...(header as Record<string, unknown>), name: canonical },
    };
}

export type CorrectDisplayNameResult =
    | { ok: true; policy: DisplayNamePolicy }
    | { ok: false; status: 400 | 409 | 503; error: string };

export async function correctDisplayNameOnce(
    userId: string,
    requestedName: string,
): Promise<CorrectDisplayNameResult> {
    const id = userId.trim();
    if (!isPostgresUuidSubject(id)) {
        return { ok: false, status: 400, error: 'معرّف غير صالح' };
    }
    const next = normalizeLegalDisplayName(requestedName);
    if (next.length < 3) {
        return { ok: false, status: 400, error: 'الاسم الثلاثي مطلوب' };
    }
    const admin = getSupabaseAdminClient();
    if (!admin) {
        return { ok: false, status: 503, error: 'تعذّر حفظ الاسم' };
    }

    const current = await readDisplayNamePolicy(id);
    if (!current) {
        return { ok: false, status: 503, error: 'تعذّر قراءة الاسم' };
    }
    if (current.fullName === next) {
        return { ok: true, policy: current };
    }
    if (!current.canCorrect) {
        return { ok: false, status: 409, error: 'يمكن تصحيح الاسم مرة واحدة فقط' };
    }

    try {
        const { data } = await getGoTrueAdminApi(admin).getUserById(id);
        const meta =
            data?.user?.user_metadata && typeof data.user.user_metadata === 'object'
                ? { ...(data.user.user_metadata as Record<string, unknown>) }
                : {};
        const { error } = await getGoTrueAdminApi(admin).updateUserById(id, {
            user_metadata: { ...meta, fullName: next },
        });
        if (error) {
            return { ok: false, status: 503, error: 'تعذّر حفظ الاسم' };
        }
    } catch {
        return { ok: false, status: 503, error: 'تعذّر حفظ الاسم' };
    }

    const after = await readDisplayNamePolicy(id);
    if (!after || after.fullName !== next) {
        return { ok: false, status: 409, error: 'يمكن تصحيح الاسم مرة واحدة فقط' };
    }
    return { ok: true, policy: after };
}
