import {
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    isExecutorHubRowInactiveForGoverning,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readSeizureRequestTarget,
    type PersonalCoerciveSubtype,
    type SeizureRequestSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { OtherPartyRequestOutcome } from './otherPartyEffectiveRequestsTypes';

const REQUEST_HINTS: Record<string, string> = {
    'pc-forced_bring_in': 'طلب إحضار المدين بالقوة — يظهر لوكيل الدائن بعد انتهاء مهلة الإخبار دون حضور.',
    'pc-travel_ban': 'طلب منع سفر المدين — ضمن التنفيذ الجبري الشخصي.',
    'pc-arrest_warrant_investigation': 'مفاتحة محكمة التحقيق — بعد تسجيل «متخفي» في الإحضار الجبري.',
    'pc-executive_dossier_presentation': 'عرض الإضبارة على قاضي البداءة — مسار الحبس التنفيذي.',
    'pc-executive_detention_judge': 'قرار قاضي البداءة بالحبس — بعد موافقة عرض الإضبارة.',
    'sz-debtor-salary': 'حجز راتب أو مستحقات — للمدين الموظف عند وجود مبلغ قائم.',
    'sz-debtor-property': 'حجز عقار بإجراءات المزاد أو التقدير.',
    'sz-debtor-movable': 'حجز منقولات المدين.',
    'sz-debtor-third_party': 'حجز مبالغ أو أصول لدى الغير.',
    'gu-request': 'طلب توجيه الكفيل أو ضمان التنفيذ.',
    'break-inventory': 'طلب كسر الأقفال للوصول إلى العين محل التنفيذ.',
};

export function hintForEntry(id: string, label: string): string {
    return REQUEST_HINTS[id] || `خيار «${label}» — كما يظهر حالياً لوكيل الدائن في محضر المتابعة.`;
}

export function resolveExecutorOutcomeShort(row: Record<string, unknown> | null): {
    outcome: OtherPartyRequestOutcome;
    statusShort: string;
    hasRequest: boolean;
} {
    if (!row) {
        return { outcome: 'none', statusShort: '—', hasRequest: false };
    }
    if (isExecutorRowRejectedAndFinal(row)) {
        return { outcome: 'rejected', statusShort: 'مرفوض', hasRequest: true };
    }
    const raw = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending').trim();
    if (raw === 'alternative') {
        return { outcome: 'alternative', statusShort: 'بديل', hasRequest: true };
    }
    if (raw === 'pending' || raw === '') {
        return { outcome: 'pending', statusShort: 'قيد البت', hasRequest: true };
    }
    if (isExecutorRowEffectivelyApproved(row)) {
        return { outcome: 'effective', statusShort: 'نافذ', hasRequest: true };
    }
    if (raw === 'approved') {
        return { outcome: 'effective', statusShort: 'موافق', hasRequest: true };
    }
    return { outcome: 'pending', statusShort: 'قيد البت', hasRequest: true };
}

export function governingPersonalRow(
    decisions: Record<string, unknown>[],
    subtype: PersonalCoerciveSubtype,
    opts?: { activeDebtorKey?: string; primaryDebtorKey?: string },
): Record<string, unknown> | null {
    const row = getGoverningPersonalCoerciveSubtypeRowFromDecisions(decisions, subtype, opts);
    if (!row || isExecutorHubRowInactiveForGoverning(row, decisions)) return null;
    return row;
}

function seizureSubtypeMatches(st: string, subtype: SeizureRequestSubtype): boolean {
    if (subtype === 'movable') {
        return st === 'movable' || st === 'movable_auction';
    }
    return st === subtype;
}

export function governingSeizureRow(
    decisions: Record<string, unknown>[],
    subtype: SeizureRequestSubtype,
    target: 'debtor' | 'guarantor' = 'debtor',
): Record<string, unknown> | null {
    const rows = decisions.filter((r) => {
        if (String(r.requestKind || '') !== 'seizure') return false;
        let st = String((r as { seizureSubtype?: string }).seizureSubtype || '').trim();
        if (!st && subtype === 'property') {
            if (/عقار/i.test(`${String(r.title || '')}\n${String(r.body || '')}`)) st = 'property';
        }
        if (!seizureSubtypeMatches(st, subtype)) return false;
        return readSeizureRequestTarget(r) === target;
    });
    if (rows.length === 0) return null;
    const sorted = [...rows].sort(
        (a, b) =>
            String((b as { date?: string }).date || '').localeCompare(
                String((a as { date?: string }).date || '')
            )
    );
    const row = sorted.find((r) => !isExecutorHubRowInactiveForGoverning(r, decisions)) ?? sorted[0]!;
    return row ?? null;
}
