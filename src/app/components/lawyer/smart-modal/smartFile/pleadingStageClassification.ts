import type { CaseStage } from '../../LawyerShared';
import { isAbsentObjectionStageName } from './absentJudgmentFlow';
import { isAppealStageName, isCassationStageName } from './judgmentTypes';

function isCassationCorrectionStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s) return false;
    return s === 'تصحيح قرار' || (s.includes('تصحيح') && s.includes('قرار'));
}

/** مراحل إجرائية — ليست مرافعة (لا تُعاد إليها بعد نقض التمييز أو قبول التصحيح). */
export function isNonPleadingProceduralStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s) return false;
    return isCassationStageName(s) || isCassationCorrectionStageName(s);
}

export function isThirdPartyObjectionStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    return (
        s.includes('اعتراض الغير')
        || s.includes('حكم الغير')
        || s.includes('الاعتراض على حكم الغير')
    );
}

export function isRetrialPleadingStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    return s.includes('إعادة المحاكمة') || s.includes('إعادة محاكمة');
}

/** بداءة بدرجاتها (وليس استئنافاً ولا طعناً استثنائياً). */
export function isBeginningPleadingStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s) return false;
    if (isNonPleadingProceduralStageName(s)) return false;
    if (isAppealStageName(s)) return false;
    if (isAbsentObjectionStageName(s)) return false;
    if (isThirdPartyObjectionStageName(s)) return false;
    if (isRetrialPleadingStageName(s)) return false;
    if (s.includes('أحوال شخصية') || s === 'الأحوال الشخصية') return true;
    return s.includes('بداءة') || s.includes('البداءة');
}

/**
 * مراحل المرافعة الفعلية:
 * بداءة (كل درجاتها) · استئناف · إعادة محاكمة · اعتراض غيابي · اعتراض الغير
 */
export function isPleadingStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s) return false;
    if (isNonPleadingProceduralStageName(s)) return false;
    if (isAppealStageName(s)) return true;
    if (isAbsentObjectionStageName(s)) return true;
    if (isThirdPartyObjectionStageName(s)) return true;
    if (isRetrialPleadingStageName(s)) return true;
    if (s.includes('أحوال شخصية') || s === 'الأحوال الشخصية') return true;
    return s.includes('بداءة') || s.includes('البداءة');
}

export type PleadingLayer = 'appeal' | 'first_instance';

export function resolvePleadingLayer(stageName?: string | null): PleadingLayer {
    if (isAppealStageName(stageName)) return 'appeal';
    return 'first_instance';
}

function stageLabel(stage: CaseStage | undefined): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

/** اسم المرحلة الموحّد — يدعم السجلات القديمة التي تستخدم `name` فقط. */
export function resolvePleadingStageLabel(
    stage?: Pick<CaseStage, 'stageName' | 'name'> | { stageName?: string | null; name?: string | null } | null,
): string {
    if (!stage) return '';
    return String(stage.stageName ?? stage.name ?? '').trim();
}

/**
 * آخر مرحلة مرافعة نشطة قبل فهرس محدد (تجاهل التمييز وتصحيح القرار).
 */
export function resolveLastPleadingStageIndex(
    stages: CaseStage[],
    beforeExclusiveIndex?: number,
): number {
    const end = beforeExclusiveIndex ?? stages.length;
    for (let i = end - 1; i >= 0; i--) {
        const name = stageLabel(stages[i]);
        if (isPleadingStageName(name)) return i;
    }
    return -1;
}
