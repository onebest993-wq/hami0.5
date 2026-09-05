export const CREATION_REVEAL_STEPS = [
    'directorate',
    'fileNumber',
    'docType',
    'docNumber',
    'judgmentDate',
    'shariaIdentity',
    'classification',
    'claimType',
    'claimAmounts',
    'lawyerFees',
    'creditors',
    'debtors',
] as const;

export type CreationRevealStep = (typeof CREATION_REVEAL_STEPS)[number];

const COURT_OR_FOREIGN_DOC_TYPES = new Set(['قرارات وأحكام المحاكم', 'تنفيذ الأحكام الأجنبية']);

export type CreationRevealContext = {
    docType: string;
    hasAmountStep: boolean;
    showLawyerFees: boolean;
};

export function buildCreationRevealQueue(ctx: CreationRevealContext): CreationRevealStep[] {
    const queue: CreationRevealStep[] = ['directorate', 'fileNumber', 'docType'];
    const docType = String(ctx.docType || '').trim();
    if (!docType) return queue;

    if (docType === 'الحجج الشرعية') {
        queue.push('shariaIdentity');
    } else if (COURT_OR_FOREIGN_DOC_TYPES.has(docType)) {
        queue.push('docNumber', 'judgmentDate', 'classification');
    } else if (docType !== 'الأوراق التجارية') {
        queue.push('docNumber');
    }

    queue.push('claimType');
    /**
     * دائماً بعد نوع المطالبة — حتى للمطالبات غير النقدية (تخلية، تسليم، مشاهدة…).
     * الحقول المخصّصة تعيش داخل هذه الخطوة؛ إخفاؤها عند !hasAmountStep كان يبتلعها.
     */
    queue.push('claimAmounts');
    // أتعاب المحاماة (ctx.showLawyerFees) تُعرض بالتوازي من النموذج — ليست بوابة لإخفاء الأطراف
    queue.push('creditors', 'debtors');
    return queue;
}

export function isCreationStepRevealed(
    step: CreationRevealStep,
    queue: readonly CreationRevealStep[],
    committed: ReadonlySet<CreationRevealStep>,
): boolean {
    const index = queue.indexOf(step);
    if (index < 0) return false;
    if (index === 0) return true;
    return committed.has(queue[index - 1]!);
}

export function nextCreationRevealStep(
    step: CreationRevealStep,
    queue: readonly CreationRevealStep[],
): CreationRevealStep | null {
    const index = queue.indexOf(step);
    if (index < 0) return null;
    return queue[index + 1] ?? null;
}

export function addCreationCommit(
    committed: ReadonlySet<CreationRevealStep>,
    step: CreationRevealStep,
    queue: readonly CreationRevealStep[],
): Set<CreationRevealStep> {
    const next = new Set(committed);
    if (queue.includes(step)) next.add(step);
    return next;
}

export function pruneCreationCommitsToQueue(
    committed: ReadonlySet<CreationRevealStep>,
    queue: readonly CreationRevealStep[],
): Set<CreationRevealStep> {
    const keep = new Set<CreationRevealStep>();
    for (const step of committed) {
        if (queue.includes(step)) keep.add(step);
    }
    return keep;
}

export function isCreationEnterCommit(event: {
    key: string;
    shiftKey?: boolean;
    nativeEvent?: { isComposing?: boolean; keyCode?: number };
}): boolean {
    if (event.key !== 'Enter' || event.shiftKey) return false;
    if (event.nativeEvent?.isComposing) return false;
    if (event.nativeEvent?.keyCode === 229) return false;
    return true;
}

export function focusCreationStep(step: CreationRevealStep, attempt = 0): void {
    if (typeof document === 'undefined') return;
    const el = document.querySelector<HTMLElement>(`[data-creation-step="${step}"]`);
    if (el) {
        el.focus();
        return;
    }
    if (attempt >= 12) return;
    requestAnimationFrame(() => focusCreationStep(step, attempt + 1));
}
