import {
    DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
    type InvestigationDefendantStatus,
} from '@/app/types/investigationDefendant';
import type { CriminalDefendant } from './criminalStore';
import { isDefendantIdentityUnknown } from './criminalUnknownDefendant';

export type { InvestigationDefendantStatus } from '@/app/types/investigationDefendant';
export { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from '@/app/types/investigationDefendant';

/** هل لا يزال هناك متهم نشط في التحقيق؟ */
export function hasActiveInvestigationDefendants(
    defendants: CriminalDefendant[] | undefined,
): boolean {
    return filterActiveInvestigationDefendants(defendants).length > 0;
}

/** يُعرض محدّد المتهم فقط عند وجود أكثر من متهم نشط واحد (بعد الغلق/الصلح/الإحالة). */
export function shouldShowInvestigationDefendantScopePicker(
    defendants: CriminalDefendant[] | undefined,
): boolean {
    return filterActiveInvestigationDefendants(defendants).length > 1;
}

export function normalizeInvestigationDefendantStatus(
    raw: unknown,
): InvestigationDefendantStatus {
    const v = String(raw ?? '').trim();
    if (v === 'closed_pending' || v === 'closed_final' || v === 'referred') return v;
    return DEFAULT_INVESTIGATION_DEFENDANT_STATUS;
}

export function filterActiveInvestigationDefendants(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => {
        const status = normalizeInvestigationDefendantStatus(d.investigationStatus);
        return status === 'active';
    });
}

/** إخفاء المتهمين المغلق بحقهم (مؤقت/نهائي) أو المُحالين من واجهة الأطراف النشطة. */
export function filterVisibleInvestigationDefendants(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return filterActiveInvestigationDefendants(defendants);
}

/**
 * أطراف التحقيق الظاهرة في الشبكة — مع إظهار متهمي التفريق المعلّق
 * حتى لو كانت حالتهم closed_pending / referred (لا يُخفون أثناء تعبئة الشطر).
 */
export function resolveVisibleInvestigationDefendants(
    defendants: CriminalDefendant[] | undefined,
    options?: { alwaysIncludeDefendantIds?: string[] },
): CriminalDefendant[] {
    const visible = filterVisibleInvestigationDefendants(defendants);
    const extraIds = new Set(
        (Array.isArray(options?.alwaysIncludeDefendantIds) ? options.alwaysIncludeDefendantIds : [])
            .map((x) => String(x ?? '').trim())
            .filter(Boolean),
    );
    if (!extraIds.size) return visible;
    const list = Array.isArray(defendants) ? defendants : [];
    const visibleIds = new Set(visible.map((d) => d.id));
    const extras = list.filter((d) => extraIds.has(d.id) && !visibleIds.has(d.id));
    return extras.length ? [...visible, ...extras] : visible;
}

/** أطراف مؤهلون لسجل الإفادات — نشطون ومعلومون فقط (المجهول شبح إجرائي). */
export function filterStatementEligibleDefendants(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return filterActiveInvestigationDefendants(defendants).filter(
        (d) => !isDefendantIdentityUnknown(d),
    );
}
