import React from 'react';
import { ClipboardList } from 'lucide-react';
import {
    openUnifiedSeizureLogTab,
    type UnifiedSeizureLogTab,
} from './seizureRequestsTabHelpers';

export function SeizureLogNavigateBadge(props: {
    tab: UnifiedSeizureLogTab;
    tone?: 'sky' | 'violet' | 'amber' | 'emerald';
    /** عند التسجيل المكتمل: إغلاق الاختصار وإعادة دورة الطلب ثم فتح السجل */
    onAcknowledgeCycle?: () => void;
}) {
    const toneClass =
        props.tone === 'violet'
            ? 'border-violet-300/35 bg-violet-500/10 text-violet-100 hover:bg-violet-500/18'
            : props.tone === 'amber'
              ? 'border-amber-300/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/18'
              : props.tone === 'emerald'
                ? 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/18'
                : 'border-sky-300/35 bg-sky-500/10 text-sky-100 hover:bg-sky-500/18';

    const handleClick = props.onAcknowledgeCycle ?? (() => openUnifiedSeizureLogTab(props.tab));
    const actionLabel = props.onAcknowledgeCycle
        ? 'إغلاق الاختصار وفتح سجل الحجز'
        : 'فتح سجل الحجز';

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick();
            }}
            className={`inline-flex shrink-0 flex-row-reverse items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${toneClass}`}
            title={actionLabel}
            aria-label={actionLabel}
        >
            <ClipboardList size={12} strokeWidth={2.25} className="opacity-90" />
            <span>السجل</span>
        </button>
    );
}
