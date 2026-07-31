import {
    DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE,
    parseOtherPartyTrackPayload,
} from '@/app/utils/otherPartyManualTrackDecisionSync';
import { isCommunicationDecision } from '../components/communicationDecisionModel';

/** عناوين ضوابط الإضبارة — تُدار من تبويبها الخاص وليس من محضر نماذج الطلبات */
const DOSSIER_CONTROLS_ONLY = new Set([
    'طلب توحيد الأضابير',
    'طلب نقل الإضبارة',
    'طلب الإنابة التنفيذية',
    'طلب مخاطبة مديرية الانابة',
    'طلب تجديد الإضبارة',
]);

const LEGACY_ADMIN_TEMPLATES = [
    'طلب تصحيح خطأ مادي',
    'طلب تجديد الإضبارة',
    'طلب انتداب خبير/خبراء',
    'الاعتراض على تقرير الخبراء',
    'تحديد موعد المزايدة العلنية',
    'الإحالة القطعية',
] as const;

const OTHER_PARTY_TITLE_RE = /تحرك\s*الطرف\s*الآخر/i;

function parseAdminPayloadKind(row: Record<string, unknown>): string {
    const raw = String(row.payloadJson || '').trim();
    if (!raw) return '';
    try {
        const v = JSON.parse(raw) as { kind?: unknown };
        return String(v?.kind || '').trim();
    } catch {
        return '';
    }
}

/**
 * قرار «تحركات الطرف الآخر» — يجب ألا يظهر في تبويب نماذج الطلبات.
 */
export function isOtherPartySpecialFollowupDecision(row: Record<string, unknown> | null | undefined): boolean {
    if (!row) return false;
    if (String(row.requestKind || '') !== 'special_followup') return false;

    if (String(row.appealRequestOrigin || '').trim() === 'debtor_side') return true;

    const title = String(row.title || '').trim();
    if (OTHER_PARTY_TITLE_RE.test(title)) return true;

    const track = parseOtherPartyTrackPayload(row);
    if (track?.otherPartyTrackOptionId) return true;
    if (track?.source === DEBTOR_AGENT_CREDITOR_MIRROR_SOURCE) return true;

    return false;
}

/**
 * قرار يخص محضر «نماذج الطلبات» فقط — معزول عن تحركات الطرف الآخر والمخاطبات.
 */
export function isAdminRequestsTabDecision(row: Record<string, unknown> | null | undefined): boolean {
    if (!row) return false;
    if (String(row.requestKind || '') !== 'special_followup') return false;
    if (isOtherPartySpecialFollowupDecision(row)) return false;
    if (isCommunicationDecision(row)) return false;

    const kind = parseAdminPayloadKind(row);
    if (kind === 'admin_template' || kind === 'manual_followup') return true;

    const title = String(row.title || '').trim();
    if (DOSSIER_CONTROLS_ONLY.has(title)) return false;

    if (
        title &&
        LEGACY_ADMIN_TEMPLATES.includes(title as (typeof LEGACY_ADMIN_TEMPLATES)[number])
    ) {
        return true;
    }

    // طلب إداري حر قديم بلا payload: يبقى على محضر الطلبات ما دام ليس طرفاً آخر
    const origin = String(row.appealRequestOrigin || '').trim();
    if (title && (!origin || origin === 'creditor_side')) return true;

    return false;
}
