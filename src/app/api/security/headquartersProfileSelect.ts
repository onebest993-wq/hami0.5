import type { SupabaseClient } from '@supabase/supabase-js';

export const PROFILE_HQ_COLUMNS = 'id, role, status, created_at, is_banned, is_active, is_deleted, deleted_at';
export const PROFILE_HQ_COLUMNS_WITH_FREEZE = `${PROFILE_HQ_COLUMNS}, freeze_until`;
export const PROFILE_HQ_COLUMNS_FULL = `${PROFILE_HQ_COLUMNS_WITH_FREEZE}, login_until, login_blocked`;
export const PROFILE_HQ_COLUMNS_BADGE = `${PROFILE_HQ_COLUMNS_FULL}, public_verified_badge`;
export const PROFILE_HQ_COLUMNS_NAME = `${PROFILE_HQ_COLUMNS_BADGE}, legal_display_name, previous_legal_display_name, legal_display_name_corrections, legal_display_name_corrected_at`;

export function isMissingProfileColumn(message: string, column: string): boolean {
    const hay = message.toLowerCase();
    return hay.includes(column) && (hay.includes('does not exist') || hay.includes('schema cache'));
}

export async function withHeadquartersProfileColumns<T extends { error?: { message?: string } | null }>(
    run: (columns: string) => Promise<T>,
): Promise<T> {
    const first = await run(PROFILE_HQ_COLUMNS_NAME);
    if (first.error && isMissingProfileColumn(first.error.message ?? '', 'legal_display_name')) {
        const withoutName = await run(PROFILE_HQ_COLUMNS_BADGE);
        if (withoutName.error && isMissingProfileColumn(withoutName.error.message ?? '', 'public_verified_badge')) {
            const withoutBadge = await run(PROFILE_HQ_COLUMNS_FULL);
            if (withoutBadge.error && isMissingProfileColumn(withoutBadge.error.message ?? '', 'login_')) {
                const second = await run(PROFILE_HQ_COLUMNS_WITH_FREEZE);
                if (second.error && isMissingProfileColumn(second.error.message ?? '', 'freeze_until')) {
                    return run(PROFILE_HQ_COLUMNS);
                }
                return second;
            }
            if (withoutBadge.error && isMissingProfileColumn(withoutBadge.error.message ?? '', 'freeze_until')) {
                return run(PROFILE_HQ_COLUMNS);
            }
            return withoutBadge;
        }
        if (withoutName.error && isMissingProfileColumn(withoutName.error.message ?? '', 'login_')) {
            const second = await run(PROFILE_HQ_COLUMNS_WITH_FREEZE);
            if (second.error && isMissingProfileColumn(second.error.message ?? '', 'freeze_until')) {
                return run(PROFILE_HQ_COLUMNS);
            }
            return second;
        }
        if (withoutName.error && isMissingProfileColumn(withoutName.error.message ?? '', 'freeze_until')) {
            return run(PROFILE_HQ_COLUMNS);
        }
        return withoutName;
    }
    if (first.error && isMissingProfileColumn(first.error.message ?? '', 'public_verified_badge')) {
        const withoutBadge = await run(PROFILE_HQ_COLUMNS_FULL);
        if (withoutBadge.error && isMissingProfileColumn(withoutBadge.error.message ?? '', 'login_')) {
            const second = await run(PROFILE_HQ_COLUMNS_WITH_FREEZE);
            if (second.error && isMissingProfileColumn(second.error.message ?? '', 'freeze_until')) {
                return run(PROFILE_HQ_COLUMNS);
            }
            return second;
        }
        if (withoutBadge.error && isMissingProfileColumn(withoutBadge.error.message ?? '', 'freeze_until')) {
            return run(PROFILE_HQ_COLUMNS);
        }
        return withoutBadge;
    }
    if (first.error && isMissingProfileColumn(first.error.message ?? '', 'login_')) {
        const second = await run(PROFILE_HQ_COLUMNS_WITH_FREEZE);
        if (second.error && isMissingProfileColumn(second.error.message ?? '', 'freeze_until')) {
            return run(PROFILE_HQ_COLUMNS);
        }
        return second;
    }
    if (first.error && isMissingProfileColumn(first.error.message ?? '', 'freeze_until')) {
        return run(PROFILE_HQ_COLUMNS);
    }
    return first;
}

export async function selectHeadquartersProfileById(admin: SupabaseClient, userId: string) {
    return withHeadquartersProfileColumns((columns) =>
        admin.from('profiles').select(columns).eq('id', userId).maybeSingle(),
    );
}
