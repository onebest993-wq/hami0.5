import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalCase } from './criminalStore';
import { resolveDefendantFullName } from './criminalUnknownDefendant';
import {
    isInvestigationClosureAppealablePurgeTemplate,
    isInvestigationExpirationJudicialTemplate,
    isInvestigationImmediatePurgeTemplate,
    isInvestigationMergeJudicialTemplate,
    isInvestigationObjectiveFinalClosureTemplate,
    isInvestigationPurgeDecisionTemplate,
    isInvestigationSeveranceJudicialTemplate,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import { resolvePurgeDecisionDefendantIds } from './investigationDefendantPurgeScopeIds';

/** أسماء المتهمين المشمولين بقرار (للعرض على البطاقة). */
export function formatInvestigationDecisionDefendantNames(
    caseRecord: CriminalCase | undefined,
    decision: JudicialDecision,
    partyLabel?: (id: string) => string,
): string {
    if (!caseRecord) return '';
    const ids = resolvePurgeDecisionDefendantIds(caseRecord, decision);
    if (!ids.length) return '';
    const defs = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    const names = ids
        .map((id) => {
            const d = defs.find((x) => x.id === id);
            const fromDef = d ? resolveDefendantFullName(d) : '';
            if (fromDef) return fromDef;
            const fromLabel = partyLabel ? partyLabel(id) : '';
            return fromLabel && fromLabel !== '—' ? fromLabel : '';
        })
        .filter(Boolean);
    if (names.length) return [...new Set(names)].join('، ');

    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isInvestigationSeveranceJudicialTemplate(template)) {
        const summary = String(decision.summary ?? '').trim();
        const match = summary.match(/المتهمون[^:\n]*:\s*([^\n]+)/u);
        if (match?.[1]) {
            return String(match[1]).trim();
        }
        const reqId = String(decision.sourceRequestId ?? '').trim();
        if (reqId) {
            const req = (Array.isArray(caseRecord.lawyerRequests) ? caseRecord.lawyerRequests : []).find(
                (r) => r.id === reqId,
            );
            const note = String(req?.lawyerNote ?? '').trim();
            const fromNote = note.match(/المتهمون[^:\n]*:\s*([^\n]+)/u);
            if (fromNote?.[1]) return String(fromNote[1]).trim();
        }
    }
    return '';
}

export function requiresInvestigationPurgeDefendantScope(template: string | undefined): boolean {
    if (isInvestigationObjectiveFinalClosureTemplate(template)) return false;
    return (
        isInvestigationPurgeDecisionTemplate(template) ||
        isInvestigationExpirationJudicialTemplate(template)
    );
}

/** خياران حصريان لنتيجة التمييز على قرار غلق/صلح/تفريق. */
export const INVESTIGATION_PURGE_CASSATION_RESULT_OPTIONS = [
    { value: 'procedural_affirmation' as const, label: 'تأييد / تصديق القرار' },
    { value: 'procedural_annulment' as const, label: 'نقض القرار' },
];

export function validateInvestigationPurgeCassationResult(result: string | undefined): string | null {
    const r = String(result ?? '').trim();
    if (!r) return 'اختر نتيجة التمييز.';
    if (r !== 'procedural_affirmation' && r !== 'procedural_annulment') {
        return 'نتيجة غير صالحة لقرار الغلق/الصلح/التفريق.';
    }
    return null;
}

/** هل يُعرض زر الطعن التمييزي على قرار تصفية تحقيقي؟ (الصلح/التنازل = لا). */
export function investigationPurgeDecisionAllowsCassationAppeal(
    decision: Pick<JudicialDecision, 'proceduralTemplate' | 'title'>,
): boolean {
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isInvestigationMergeJudicialTemplate(template)) return true;
    if (!isInvestigationClosureAppealablePurgeTemplate(template)) return false;
    if (isInvestigationImmediatePurgeTemplate(template)) return false;
    return true;
}

type InvestigationPurgeCassationUiTone = 'default' | 'pending' | 'affirmed' | 'annulled';

type InvestigationPurgeCassationContext = {
    headline: string;
    detail: string;
    tone: InvestigationPurgeCassationUiTone;
};

function resolvePurgeAppealAppellantLabel(
    appeal: JudicialDecisionAppeal,
    partyLabel: (id: string) => string,
): string {
    const manual = String(appeal.appellantManualLabel ?? '').trim();
    if (manual) return manual;
    const ids = (Array.isArray(appeal.appellantIds) ? appeal.appellantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const names = ids.map(partyLabel).filter((n) => n && n !== '—');
    return names.length ? names.join('، ') : '—';
}

function isPurgeCassationResultFinalized(appeal: JudicialDecisionAppeal): boolean {
    const r = String(appeal.result ?? '').trim();
    return (
        appeal.cassationStatus === 'concluded' &&
        (r === 'procedural_affirmation' || r === 'procedural_annulment')
    );
}

/** سياق الطعn على بطاقة قرار الغلق/التفريق — الطعn التمiيزi هو المسار الوحيد. */
export function resolveInvestigationPurgeCassationContext(
    decision: JudicialDecision,
    partyLabel: (id: string) => string,
    pendingAppeal?: JudicialDecisionAppeal,
): InvestigationPurgeCassationContext | null {
    if (!investigationPurgeDecisionAllowsCassationAppeal(decision)) return null;

    const appeals = Array.isArray(decision.appeals) ? decision.appeals : [];
    const concluded = appeals.filter(isPurgeCassationResultFinalized);
    const latestConcluded = concluded.length ? concluded[concluded.length - 1]! : undefined;

    if (latestConcluded) {
        const result = String(latestConcluded.result ?? '').trim();
        const appellant = resolvePurgeAppealAppellantLabel(latestConcluded, partyLabel);
        if (result === 'procedural_annulment') {
            const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
            const isSeverance = isInvestigationSeveranceJudicialTemplate(template);
            const isMerge = isInvestigationMergeJudicialTemplate(template);
            return {
                headline: '⚖️ طعن تمييزي — نقض القرار',
                detail: isSeverance
                    ? `الطاعن: ${appellant}. نُقِض قرار التفريق — أُعيدت الإضبارة كما كانت قبل الشطر.`
                    : isMerge
                      ? `الطاعن: ${appellant}. نُقِض قرار التوحيد — فُكّ الضم واستُردت الإضبارة المضمومة.`
                      : `الطاعن: ${appellant}. نُقِض القرار وأُعيدت الإضبارة للحياة — يمكن متابعة التحقيق.`,
                tone: 'annulled',
            };
        }
        if (result === 'procedural_affirmation') {
            const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
            const isSeverance = isInvestigationSeveranceJudicialTemplate(template);
            const isMerge = isInvestigationMergeJudicialTemplate(template);
            return {
                headline: '⚖️ طعن تمييزي — تأييد القرار',
                detail: isSeverance
                    ? `الطاعن: ${appellant}. أُيد قرار التفريق — يستمر مسار الإضبارة المفرّقة.`
                    : isMerge
                      ? `الطاعن: ${appellant}. أُيد قرار التوحيد — يستمر العمل في الإضبارة الموحّدة.`
                      : `الطاعن: ${appellant}. أُيد القرار ويبقى الغلق سارياً.`,
                tone: 'affirmed',
            };
        }
    }

    if (pendingAppeal) {
        const appellant = resolvePurgeAppealAppellantLabel(pendingAppeal, partyLabel);
        const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
        const isSeverance = isInvestigationSeveranceJudicialTemplate(template);
        const isMerge = isInvestigationMergeJudicialTemplate(template);
        return {
            headline: '⚖️ طعن تمييزي مُسجَّل — بانتظار النتيجة',
            detail: isSeverance
                ? `الطاعن: ${appellant}. سجّل النتيجة: تأييد (يبقى التفريق) أو نقض (إلغاء الشطر كأنما لم يكن).`
                : isMerge
                  ? `الطاعن: ${appellant}. سجّل النتيجة: تأييد (يستمر الضم) أو نقض (فك التوحيد وإعادة الإضبارة).`
                  : `الطاعن: ${appellant}. سجّل النتيجة: تأييد (يبقى الغلق) أو نقض (إعادة الإضبارة للحياة).`,
            tone: 'pending',
        };
    }

    if (!appeals.length) {
        const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
        const isSeverance = isInvestigationSeveranceJudicialTemplate(template);
        const isMerge = isInvestigationMergeJudicialTemplate(template);
        return {
            headline: isSeverance
                ? '⚖️ مسار التفريق والتمييز'
                : isMerge
                  ? '⚖️ مسار التوحيد والتمييز'
                  : '⚖️ مسار الغلق والتمييز',
            detail: isSeverance
                ? 'قرار تفريق وشطر — الطعن التمييزي الوحيد. النقض يُلغي الشطر ويعيد الإضبارة كما كانت؛ التأييد يُبقي التفريق.'
                : isMerge
                  ? 'قرار ضم وتوحيد — الطعن التمييزي الوحيد. النقض يفك الضم؛ التأييد يُبقي الإضبارة موحّدة.'
                  : 'يُخفى المتهم المشمول بالغلق (مؤقت أو نهائي) من قائمة الأطراف النشطة. الطعن التمييزي هو الإجراء الوحيد على هذا القرار — النقض يُعيد الإضبارة للحياة مثل زر «إنهاء الغلق المؤقت».',
            tone: 'default',
        };
    }

    return null;
}
