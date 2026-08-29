import { isPostgresUuidSubject } from './postgresUuidSubject.ts';
import { HAMI_PLATFORM_ADMIN_UUID, getConfiguredAdminUuid } from './roleResolver.ts';
import { type AdminUser, type AdminUserRole, type AdminVerificationStatus } from '@/app/domain/admin/AdminUser';
import { parseAdminVerificationStatus } from '@/app/domain/admin/hqUserPresence';

type ProfileHqRow = {
    id?: unknown;
    role?: unknown;
    status?: unknown;
    created_at?: unknown;
    is_banned?: unknown;
    is_active?: unknown;
    is_deleted?: unknown;
    deleted_at?: unknown;
    freeze_until?: unknown;
    login_until?: unknown;
    login_blocked?: unknown;
    public_verified_badge?: unknown;
    legal_display_name?: unknown;
    previous_legal_display_name?: unknown;
    legal_display_name_corrections?: unknown;
    legal_display_name_corrected_at?: unknown;
};

/** مدير المنصّة الكانوني + ADMIN_UUID إن كان UUID حقيقياً — لا يُحظر ولا يُغيَّر دوره من المقر */
export function isHeadquartersProtectedAdminId(userId: string): boolean {
    const id = String(userId ?? '').trim().toLowerCase();
    if (!isPostgresUuidSubject(id)) return false;
    if (id === HAMI_PLATFORM_ADMIN_UUID.toLowerCase()) return true;
    const configured = getConfiguredAdminUuid().trim().toLowerCase();
    return isPostgresUuidSubject(configured) && id === configured;
}

/** أي حساب بدور إدارة — الواجهة تقفله، والخادم يجب أن يقفله أيضاً. */
export function isHeadquartersAdminRole(role: unknown): boolean {
    return String(role ?? '').trim().toLowerCase() === 'admin';
}

export function mapHeadquartersStatus(row: ProfileHqRow): AdminUser['status'] {
    const untilRaw = (row as { freeze_until?: unknown }).freeze_until;
    if (untilRaw != null && String(untilRaw).trim() !== '') {
        const until = Date.parse(String(untilRaw));
        if (Number.isFinite(until) && until > Date.now()) return 'suspended';
        return 'active';
    }
    const statusRaw = String(row.status ?? '').trim().toLowerCase();
    if (statusRaw === 'banned' || statusRaw === 'suspended' || statusRaw === 'frozen') {
        return 'suspended';
    }
    if (row.is_banned === true || row.is_active === false) return 'suspended';
    return 'active';
}

export function mapHeadquartersRole(raw: unknown): AdminUserRole {
    const role = String(raw ?? '').trim().toLowerCase();
    if (role === 'admin' || role === 'moderator' || role === 'lawyer') {
        return role;
    }
    return 'lawyer';
}

export function mapHeadquartersUser(
    row: ProfileHqRow,
    identity?: {
        email?: string;
        fullName?: string;
        familyName?: string;
        phone?: string;
        governorate?: string;
        lawyerBarRoom?: string;
        kycSubmittedName?: string;
    },
    verificationStatus: AdminVerificationStatus | unknown = 'none',
): AdminUser | null {
    const id = String(row.id ?? '').trim();
    if (!isPostgresUuidSubject(id)) return null;
    const email = String(identity?.email ?? '').trim();
    const given =
        String(row.legal_display_name ?? '').trim() || String(identity?.fullName ?? '').trim();
    const familyName = String(identity?.familyName ?? '').trim();
    const createdAtRaw = row.created_at;
    const createdAt =
        typeof createdAtRaw === 'string' && createdAtRaw.trim()
            ? createdAtRaw.trim()
            : createdAtRaw instanceof Date
              ? createdAtRaw.toISOString()
              : new Date(0).toISOString();
    return {
        id,
        email,
        fullName: given,
        familyName,
        phone: String(identity?.phone ?? '').trim(),
        governorate: String(identity?.governorate ?? '').trim(),
        lawyerBarRoom: String(identity?.lawyerBarRoom ?? '').trim(),
        role: mapHeadquartersRole(row.role),
        status: mapHeadquartersStatus(row),
        createdAt,
        freezeUntil: readIso(row.freeze_until),
        loginUntil: readIso(row.login_until),
        loginBlocked: row.login_blocked === true,
        isDeleted: row.is_deleted === true || Boolean(readIso(row.deleted_at)),
        verificationStatus: parseAdminVerificationStatus(verificationStatus),
        publicVerifiedBadge: row.public_verified_badge === true,
        previousLegalDisplayName: String(row.previous_legal_display_name ?? '').trim() || null,
        legalDisplayNameCorrectedAt: readIso(row.legal_display_name_corrected_at),
        legalDisplayNameCorrections: Number(row.legal_display_name_corrections ?? 0) >= 1 ? 1 : 0,
        kycSubmittedName: String(identity?.kycSubmittedName ?? '').trim() || null,
    };
}

function readIso(raw: unknown): string | null {
    if (raw == null || String(raw).trim() === '') return null;
    const iso = raw instanceof Date ? raw.toISOString() : String(raw).trim();
    return iso || null;
}
