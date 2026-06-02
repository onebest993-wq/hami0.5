/**
 * @file decisionsLedgerVisuals.ts
 *
 * تَصنيف بصريّ ومنطقيّ لِسِجلّ القرارات والطعون (Decisions & Appeals Ledger).
 *
 * الهَدف:
 *   1. توحيد ألوان الحدود لأنماط القرارات بحسب طبيعتها القانونية:
 *      • قرارات مَاسّة بالحرية (توقيف/قبض/حجز)   → أحمر/وردي.
 *      • قرارات استقدام/تحذير                       → كهرماني.
 *      • قرارات إخلاء سبيل/تكفيل                    → سماوي.
 *      • إجراءات عامة وطلبات محامٍ                  → فضي/رمادي.
 *   2. تَوفير فلتر مُوحَّد لشريط الفلترة (الكل / قضائية / طلبات محامٍ)
 *      مع منع تَسرّب أي قرار قضائي إلى تَصنيف طلبات المحامي والعكس.
 *
 * هذه الدّوال خالصة (Pure): لا تَلمس الـ Store، ولا تُعدِّل القرار،
 * ولا تَفترض شَكل البطاقة — فقط تُرجع تَصنيفاً ثابتاً قابلاً للاختبار.
 */

import type { JudicialDecision } from '@/app/types/criminal';
import {
    isAssetSeizureTemplate,
    isDefendantBailTemplate,
    isDetentionDecisionTemplate,
    isJudicialDecisionTemplate,
    isLawyerMotionTemplate,
    isOrderEnforcementTemplate,
    normalizeProceduralRequestTemplate,
    resolveOrderEnforcementKindFromTemplate,
    BAIL_RELEASE_TEMPLATE,
} from './proceduralRequestTypes';

/**
 * نمط المسار في السجل — يُستخدم لِفلترة الواجهة فقط (لا يُؤثّر على البيانات).
 *
 *   - `judicial`     : قرار قضائي مُسجَّل (Judicial Decision Card).
 *   - `lawyer_motion`: قرار/طلب محامٍ بَعد البتّ به (Lawyer Motion Card).
 */
export type DecisionLedgerKind = 'judicial' | 'lawyer_motion';

/**
 * نمط بصريّ يُعكَس في الإطار الزجاجي للحدود/التَوهج.
 *
 *   - `restrictive`: قرارات تَمسّ الحرية (توقيف، قبض، حجز أموال).
 *   - `summon`     : قرارات استقدام / تحذير.
 *   - `release`    : قرارات تكفيل / إخلاء سبيل.
 *   - `general`    : قرارات عامة وطلبات محامٍ غير ماسّة.
 */
export type DecisionVisualKind = 'restrictive' | 'summon' | 'release' | 'general';

const RESTRICTIVE_KEYWORDS = /قبض|حجز|حرمان|مَنع\s*السفر|منع\s*السفر|إيقاف\s*تنفيذ/u;
const SUMMON_KEYWORDS = /استقدام|تحذير|إنذار/u;
const RELEASE_KEYWORDS = /تكفيل|كفالة|إخلاء\s*سبيل|إفراج/u;

/**
 * يُصَنِّف القرار قانونياً إلى مَسار «قضائي» أو «طلب محامٍ» — مَع تَفضيل صارم
 * للقَالب الإجرائي (proceduralTemplate) قبل العنوان لِتَفادي اللَّبس.
 */
export function classifyDecisionLedgerKind(decision: JudicialDecision): DecisionLedgerKind {
    if (decision.decisionType === 'dispositive') return 'judicial';
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isJudicialDecisionTemplate(template)) return 'judicial';
    if (isLawyerMotionTemplate(template)) return 'lawyer_motion';
    return 'judicial';
}

export function formatDecisionLedgerKindLabel(kind: DecisionLedgerKind): string {
    return kind === 'lawyer_motion' ? 'طلب من المحامي' : 'قرار من القاضي';
}

/** ألوان مميزة لمسار السجل — قرار قضائي (سماوي) مقابل طلب محامٍ (بنفسجي). */
export const DECISION_LEDGER_KIND_THEME: Record<
    DecisionLedgerKind,
    {
        border: string;
        background: string;
        chipBg: string;
        chipText: string;
        glow: string;
        spine: string;
    }
> = {
    judicial: {
        border: 'border-sky-500/40',
        background: 'bg-sky-950/25',
        chipBg: 'bg-sky-500/18 border-sky-400/50',
        chipText: 'text-sky-100',
        glow: 'shadow-[0_0_16px_rgba(56,189,248,0.14)]',
        spine: 'bg-sky-400/55',
    },
    lawyer_motion: {
        border: 'border-violet-500/40',
        background: 'bg-violet-950/25',
        chipBg: 'bg-violet-500/18 border-violet-400/50',
        chipText: 'text-violet-100',
        glow: 'shadow-[0_0_16px_rgba(139,92,246,0.14)]',
        spine: 'bg-violet-400/55',
    },
};

export function resolveDecisionLedgerKindTheme(decision: JudicialDecision) {
    return DECISION_LEDGER_KIND_THEME[classifyDecisionLedgerKind(decision)];
}

export const LAWYER_REQUEST_CARD_THEME = DECISION_LEDGER_KIND_THEME.lawyer_motion;

/**
 * يُصَنِّف القرار بَصرياً (لأغراض حدود البطاقة) — يَعتمد القَالب الإجرائي أوّلاً،
 * ثم يَسقط بأمان إلى عناوين الكلمات المفتاحية. لا يَستعمل ألواناً عشوائية.
 */
export function classifyDecisionVisualKind(decision: JudicialDecision): DecisionVisualKind {
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isDetentionDecisionTemplate(template)) return 'restrictive';
    if (isAssetSeizureTemplate(template)) return 'restrictive';
    if (isOrderEnforcementTemplate(template)) {
        const kind = resolveOrderEnforcementKindFromTemplate(template);
        return kind === 'arrest' ? 'restrictive' : 'summon';
    }
    if (isDefendantBailTemplate(template) || template === BAIL_RELEASE_TEMPLATE) return 'release';
    const text = `${decision.title ?? ''} ${decision.summary ?? ''}`;
    if (RESTRICTIVE_KEYWORDS.test(text)) return 'restrictive';
    if (SUMMON_KEYWORDS.test(text)) return 'summon';
    if (RELEASE_KEYWORDS.test(text)) return 'release';
    return 'general';
}

/** قاموس أصناف Tailwind الجاهزة لِكل تَصنيف بصري — مَركزية لِضمان الاتساق. */
export const DECISION_VISUAL_THEME: Record<
    DecisionVisualKind,
    {
        /** خاصية الحدود الأساسية (Tailwind). */
        border: string;
        /** خَلفية زجاجية شَفافة. */
        background: string;
        /** خَلفية الشارة الفرعية (chip). */
        chipBg: string;
        /** لون نَصّ الشارة الفرعية (chip). */
        chipText: string;
        /** لون أيقونة الرّأس. */
        iconText: string;
        /** ظِلال التوهج البَسيط (Glow). */
        glow: string;
        /** عَمود جانبي رَفيع (Spine). */
        spine: string;
    }
> = {
    restrictive: {
        border: 'border-red-500/30',
        background: 'bg-red-950/15',
        chipBg: 'bg-red-500/12 border-red-500/35',
        chipText: 'text-red-100',
        iconText: 'text-red-200/85',
        glow: 'shadow-[0_0_18px_rgba(244,63,94,0.12)]',
        spine: 'bg-red-500/45',
    },
    summon: {
        border: 'border-amber-500/30',
        background: 'bg-amber-950/12',
        chipBg: 'bg-amber-500/12 border-amber-500/35',
        chipText: 'text-amber-100',
        iconText: 'text-amber-200/85',
        glow: 'shadow-[0_0_18px_rgba(245,158,11,0.10)]',
        spine: 'bg-amber-500/50',
    },
    release: {
        border: 'border-cyan-500/30',
        background: 'bg-cyan-950/15',
        chipBg: 'bg-cyan-500/12 border-cyan-500/35',
        chipText: 'text-cyan-100',
        iconText: 'text-cyan-200/85',
        glow: 'shadow-[0_0_18px_rgba(34,211,238,0.12)]',
        spine: 'bg-cyan-500/45',
    },
    general: {
        border: 'border-white/10',
        background: 'bg-slate-900/35',
        chipBg: 'bg-white/8 border-white/15',
        chipText: 'text-white/85',
        iconText: 'text-white/70',
        glow: '',
        spine: 'bg-white/15',
    },
};

/**
 * يَحذف بادئة الصفة («الطرف:»/«مشتكي:»/«متهم:»/«مشتكي/متهم:»...) من تَسمية الطرف
 * لِيَبقى الاسم فقط — يُستعمل داخل بطاقات السجل حيث الـ Context يُغني عن التَكرار.
 */
function stripPartyRolePrefix(label: string): string {
    const trimmed = String(label ?? '').trim();
    if (!trimmed) return '';
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx < 0) return trimmed;
    return trimmed.slice(colonIdx + 1).trim() || trimmed;
}

/** هل النص اسم طرف صالح للعرض (ليس «—» ولا فراغاً)؟ */
export function isDisplayablePartyLabel(value: string | undefined): boolean {
    const s = String(value ?? '').trim();
    return Boolean(s) && s !== '—';
}

/**
 * يُحضِّر اسم/تَسمية الطرف المعني بِأمان — يَعتمد على `defendantIds` أولاً
 * ثم `beneficiaryPartyIds`. يُرجع `''` (سَلسلة فارغة) إن لم يوجد أيّ مَعنيّ.
 *
 * @param options.nameOnly  إن كان `true`، تُحذف بَوادئ الصفة («الطرف:»/«متهم:»/«مشتكي:»)
 *                          ويُعرَض الاسم فقط — مَطلوب داخل بطاقات السجل.
 */
export function resolveConcernedPartyText(
    decision: JudicialDecision,
    partyLabel: (id: string) => string,
    options?: { nameOnly?: boolean },
): string {
    const ids = ([] as string[])
        .concat(decision.defendantIds ?? [])
        .concat(decision.beneficiaryPartyIds ?? []);
    const unique = Array.from(new Set(ids.map((x) => String(x ?? '').trim()).filter(Boolean)));
    if (!unique.length) return '';
    const nameOnly = options?.nameOnly === true;
    return unique
        .map((id) => {
            const raw = partyLabel(id);
            const text = nameOnly ? stripPartyRolePrefix(raw) : raw;
            return isDisplayablePartyLabel(text) ? text : '';
        })
        .filter(Boolean)
        .join(' • ');
}

/**
 * هل البطاقة مُرتبطة بِشخص؟ يُستعمل لِإظهار سَطر «الطرف المعني» في الـ Body.
 * نَكتفي بِوجود قائمة معرّفات — لا نَستنتج من العنوان.
 */
export function decisionHasConcernedParty(
    decision: JudicialDecision,
    partyLabel?: (id: string) => string,
): boolean {
    if (!partyLabel) {
        const ids = ([] as string[])
            .concat(decision.defendantIds ?? [])
            .concat(decision.beneficiaryPartyIds ?? [])
            .map((x) => String(x ?? '').trim())
            .filter(Boolean);
        return ids.length > 0;
    }
    return Boolean(resolveConcernedPartyText(decision, partyLabel, { nameOnly: true }));
}

export type JudicialDecisionBailLike = {
    kind?: 'financial' | 'personal' | string;
    bailAmount?: string;
    guarantors?: Array<{ fullName?: string }>;
};

/** ملخّص الكفالة لعرضه على بطاقة قرار «تكفيل المتهم». */
export function formatJudicialDecisionBailSummary(
    bail: JudicialDecisionBailLike | undefined | null,
): { label: string; value: string } | null {
    if (!bail) return null;
    const kind = String(bail.kind ?? '').trim();
    if (kind === 'financial' || (!kind && String(bail.bailAmount ?? '').trim())) {
        const amount = String(bail.bailAmount ?? '').trim();
        if (!amount) return null;
        return { label: 'مبلغ الكفالة', value: amount };
    }
    if (kind === 'personal') {
        const names = (Array.isArray(bail.guarantors) ? bail.guarantors : [])
            .map((g) => String(g?.fullName ?? '').trim())
            .filter(Boolean);
        if (!names.length) return null;
        return { label: 'الكفلاء', value: names.join(' • ') };
    }
    return null;
}

function uniqueConcernedPartyIds(decision: JudicialDecision): string[] {
    return Array.from(
        new Set(
            ([] as string[])
                .concat(decision.defendantIds ?? [])
                .concat(decision.beneficiaryPartyIds ?? [])
                .map((x) => String(x ?? '').trim())
                .filter(Boolean),
        ),
    );
}

/** تسمية صف الأطراف في بطاقة السجل — «المتهمون» للقرار الموحّد. */
export function resolveLedgerPartyRowLabel(
    decision: JudicialDecision,
    partyText: string,
): { label: string; value: string } | null {
    if (!partyText.trim()) return null;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    const multi = uniqueConcernedPartyIds(decision).length > 1;
    if (multi && (isDefendantBailTemplate(template) || isDetentionDecisionTemplate(template))) {
        return { label: 'المتهمون', value: partyText };
    }
    if (isDefendantBailTemplate(template) || isDetentionDecisionTemplate(template)) {
        return { label: 'المتهم', value: partyText };
    }
    return { label: 'الطرف', value: partyText };
}

/** صفوف مدة التوقيف لبطاقات السجل (موحّدة أو فردية). */
export function formatJudicialDecisionDetentionMetaRows(
    decision: JudicialDecision,
): Array<{ label: string; value: string }> {
    const start = String(decision.detentionStartDate ?? '').trim();
    const end = String(decision.detentionEndDate ?? '').trim();
    const rows: Array<{ label: string; value: string }> = [];
    if (start) rows.push({ label: 'تاريخ البدء', value: start });
    if (end) rows.push({ label: 'تاريخ الانتهاء', value: end });
    return rows;
}

export function resolveJudicialDecisionBailSummary(
    decision: JudicialDecision,
    linkedBail?: JudicialDecisionBailLike | null,
): { label: string; value: string } | null {
    return formatJudicialDecisionBailSummary(linkedBail ?? decision.defendantBail);
}

/** المادة المعروضة على البطاقة — تُخفى إن طابقت مادة الإضبارة الحالية (الترويسة). */
export function resolveLedgerDisplayArticle(
    decision: JudicialDecision,
    activeCaseArticle?: string,
): string | undefined {
    const stored = String(decision.legalArticleBasis ?? '').trim();
    if (!stored) return undefined;
    const active = String(activeCaseArticle ?? '').trim();
    if (active && stored === active) return undefined;
    return stored;
}

/** إخفاء سطر الطرف إن الاسم مُكرّر في عنوان البطاقة. */
export function shouldShowLedgerPartyMetaRow(partyText: string, displayTitle: string): boolean {
    const name = String(partyText ?? '').trim();
    if (!name) return false;
    const title = String(displayTitle ?? '').trim();
    if (!title) return true;
    return !title.includes(name);
}
