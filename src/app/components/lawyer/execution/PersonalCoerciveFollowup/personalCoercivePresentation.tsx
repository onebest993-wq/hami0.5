import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';

export const BTN_BASE =
    'w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] relative z-10 cursor-pointer active:scale-[0.99]';
export const BTN_DISABLED = 'opacity-45 cursor-not-allowed hover:border-white/5';

/** فوق غلاف محضر المتابعة (280) — يمنع تسرّب النقرات للإجراءات خلف النافذة */
export const PERSONAL_COERCIVE_PORTAL_Z = EXEC_MODAL_Z.nestedOverFollowUpPortal;

export function PersonalCoerciveFollowUpPortal(props: {
    open: boolean;
    onDismiss: () => void;
    children: React.ReactNode;
    dismissDisabled?: boolean;
}) {
    const { open, onDismiss, children, dismissDisabled = false } = props;
    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 pointer-events-auto ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: PERSONAL_COERCIVE_PORTAL_Z }}
            role="presentation"
            onMouseDown={(e) => {
                if (dismissDisabled) return;
                if (e.target === e.currentTarget) onDismiss();
            }}
            onKeyDown={(e) => {
                if (dismissDisabled) return;
                if (e.key === 'Escape') onDismiss();
            }}
        >
            {children}
        </div>,
        document.body
    );
}

/** طي داخلي مسطح — بدون إطار مزدوج داخل الحاوية البنفسجية */
export function CoerciveSubsectionFold({
    title,
    defaultOpen = true,
    flat = false,
    titleClassName = 'text-rose-200',
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    /** عرض مسطح دون سهم طي إضافي داخل الحاوية المفتوحة */
    flat?: boolean;
    titleClassName?: string;
    children: React.ReactNode;
}) {
    if (flat) {
        return (
            <div className="border-t border-white/10 text-right first:border-t-0">
                <p className={`px-1 py-2.5 text-[11px] font-black text-right ${titleClassName}`}>{title}</p>
                <div className="space-y-2 px-1 pb-2">{children}</div>
            </div>
        );
    }
    return (
        <details className="group/sub border-t border-white/10 text-right first:border-t-0" open={defaultOpen}>
            <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-1 py-2.5 transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                <span className={`text-[11px] font-black text-right ${titleClassName}`}>{title}</span>
                <ChevronDown
                    size={16}
                    className="shrink-0 text-slate-400 transition-transform duration-200 group-open/sub:rotate-180"
                    aria-hidden
                />
            </summary>
            <div className="space-y-2 px-1 pb-2">{children}</div>
        </details>
    );
}

export const COERCIVE_SECTION_DETAILS_CLASS =
    'group overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right transition-all duration-300 open:border-violet-400/40';

/** حالة قرار المنفذ الموحّدة لأي نوع طلب إكراهي (إحضار/مفاتحة/منع سفر/عرض إضبارة) */
export interface PersonalCoerciveSubtypeOutcome {
    pending: boolean;
    approved: boolean;
    rejected: boolean;
    alternative: boolean;
}

/** مفاتيح بوابة التأكيد الإجرائية داخل محضر المتابعة — تشمل مفتاحاً محلياً (travel_ban_withdraw) خارج أنواع الطلبات الرسمية */
export type PersonalCoerciveActionGateKey =
    | 'forced_bring_in'
    | 'arrest_warrant_investigation'
    | 'travel_ban'
    | 'travel_ban_withdraw'
    | 'executive_dossier_presentation'
    | 'release_debtor';
