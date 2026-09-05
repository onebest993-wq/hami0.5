import React from 'react';
import type { SeizureRequestSubtype } from '@/app/utils/executorDecisionContracts';

function normalizeOutcome(decision: Record<string, unknown>): string {
    return String(decision.executorOutcome ?? 'pending').trim().toLowerCase() || 'pending';
}

function matchesExpectedSubtype(
    decision: Record<string, unknown>,
    expected?: SeizureRequestSubtype | SeizureRequestSubtype[] | null,
): boolean {
    if (!expected) return true;
    const allowed = (Array.isArray(expected) ? expected : [expected]).map((s) =>
        String(s).trim(),
    );
    if (allowed.length === 0) return true;
    const st = String(decision.seizureSubtype ?? '').trim();
    if (!st) {
        /** صفوف قديمة بلا subtype — اقبل فقط إن كان المعرّف طلب حجز */
        return /^seizure_req_/i.test(String(decision.id ?? ''));
    }
    return allowed.includes(st as SeizureRequestSubtype);
}

/** يظهر فقط لطلب حجز معلّق فعلاً يخصّ هذا المسار — يختفي عند البتّ أو السحب */
export function SeizureExecutorDecisionShortcut(props: {
    decision: Record<string, unknown> | null | undefined;
    onOpen: (decisionId?: string) => void;
    label?: string;
    /** يطابق بطاقة الطلب (منقول / عقار / …) حتى لا يُفتح قرار مسار آخر */
    expectedSubtype?: SeizureRequestSubtype | SeizureRequestSubtype[] | null;
}) {
    const { decision, onOpen, label = 'قرار المنفذ', expectedSubtype = null } = props;
    if (!decision) return null;
    const id = String(decision.id ?? '').trim();
    if (!id) return null;
    if (decision.lawyerWithdrawn === true) return null;
    const outcome = normalizeOutcome(decision);
    if (outcome === 'withdrawn' || outcome !== 'pending') return null;
    if (!matchesExpectedSubtype(decision, expectedSubtype)) return null;

    return (
        <button
            type="button"
            data-testid="seizure-executor-decision-shortcut"
            data-decision-id={id}
            title="فتح بطاقة قرار المنفذ العدل"
            aria-label="فتح بطاقة قرار المنفذ العدل"
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOpen(id);
            }}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl border border-[#E6C673]/40 bg-gradient-to-l from-[#E6C673]/18 via-[#E6C673]/10 to-transparent px-2.5 text-[10px] font-extrabold tracking-wide text-[#F0D78A] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] touch-manipulation transition hover:border-[#E6C673]/60 hover:from-[#E6C673]/26 hover:text-[#FFE6A8] active:scale-[0.98]"
        >
            {label}
        </button>
    );
}
