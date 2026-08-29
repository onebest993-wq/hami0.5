import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';
import { normalizeProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { canViewProfilePage, resolveProfilePageAccess } from '@/app/services/profile/profilePageAccess';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

/** يستخرج معرّف صاحب الملف من مفتاح KV: profile:{userId} */
export function parseProfileKvOwnerId(key: string): string | null {
    if (!key.startsWith('profile:')) return null;
    const ownerId = key.slice('profile:'.length).trim();
    return ownerId || null;
}

function looksLikeLawyerProfile(value: unknown): value is LawyerProfileData {
    if (!value || typeof value !== 'object') return false;
    const rec = value as Record<string, unknown>;
    return Boolean(rec.header) && typeof rec.header === 'object' && Array.isArray(rec.sections);
}

/**
 * تحقّق خادمي من علاقة "متابعة" — مستقل عن ثقة العميل.
 * ديناميكي عمداً (كما في useProfilePageAccess) لتجنّب ربط وحدة forum بمسار kv-proxy إحصائياً.
 * أي فشل (شبكة/تهيئة) ⇒ الأكثر تحفّظاً هو رفض الوصول لا منحه.
 */
async function isViewerFollowingOwner(viewerId: string, ownerId: string): Promise<boolean> {
    try {
        const { ForumFollowRepository } = await import('@/app/services/forum/forumFollowRepository');
        return await ForumFollowRepository.isFollowing(viewerId, ownerId);
    } catch {
        return false;
    }
}

/**
 * صفحة محجوبة كاملاً (private، أو followers بلا متابعة فعلية) — صفر تسريب محتوى.
 * يُبقى فقط ما تحتاجه شاشة الحجب نفسها (الاسم)، بلا هاتف/مدينة/نقابة/أقسام/كتل مخصّصة،
 * بصرف النظر عن تفضيلات الخصوصية الحقلية للمالك (تلك تخصّ من *يُسمح* له بالعرض، لا من يُحجَب كليةً).
 */
function blockedProfileStub(value: LawyerProfileData): LawyerProfileData {
    const visitorSafe = redactProfileForVisitorView(value);
    return {
        ...visitorSafe,
        header: { ...visitorSafe.header, phone: '', city: '', syndicateId: '' },
        sections: [],
        customization: {
            ...normalizeProfilePageCustomization(visitorSafe.customization),
            customBlocks: [],
        },
    };
}

/**
 * عند قراءة ملف مهني لغير المالك عبر kv-proxy:
 * ١) تُفرض بوابة pageAccess (public/followers/private) خادمياً أولاً — لا تعتمد على فحص العميل.
 * ٢) إن سُمح بالعرض، تُطبَّق تصفية الحقول الجزئية (showPhoneMeta...) كما كانت.
 */
export async function redactProfileKvValueForViewer(
    key: string,
    viewerId: string,
    value: unknown,
): Promise<unknown> {
    if (value == null) return value;
    const ownerId = parseProfileKvOwnerId(key);
    if (!ownerId) return value;
    if (ownerId === viewerId.trim()) return value;
    if (!looksLikeLawyerProfile(value)) return value;

    const pageAccess = resolveProfilePageAccess(
        normalizeProfilePageCustomization(value.customization).privacy,
    );
    const isFollowing =
        pageAccess === 'followers' ? await isViewerFollowingOwner(viewerId.trim(), ownerId) : false;

    if (!canViewProfilePage({ pageAccess, isOwner: false, isFollowing })) {
        return blockedProfileStub(value);
    }

    return redactProfileForVisitorView(value);
}
