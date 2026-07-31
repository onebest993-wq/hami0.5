export function JuvenileGuardianInline({ name }: { name: string }) {
    return (
        <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden leading-none">
            <span className="shrink-0 text-[11px] font-bold text-white/50 whitespace-nowrap">
                الوصي القانوني:
            </span>
            <span className="truncate text-[14px] font-black text-white/90 min-w-0" title={name}>
                {name}
            </span>
        </div>
    );
}

export function UnderSevenPartyBadge({ inline = false }: { inline?: boolean }) {
    return (
        <span
            className={`inline-flex shrink-0 rounded-full border border-amber-300/55 bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-100 whitespace-nowrap ${
                inline ? '' : 'mt-1'
            }`}
        >
            دون 7 سنوات
        </span>
    );
}

/**
 * شارات استثناءات الطرف على بطاقته (موكل المكتب…).
 * «الحدث» يُعرَض عبر سطر الدور «المشكو منه - حدث» وليس شارة منفصلة.
 */
export function OfficeClientBadge({ inline = false }: { inline?: boolean }) {
    return (
        <span
            className={`inline-flex shrink-0 rounded-full border border-[#E6C673]/50 bg-[#E6C673]/15 px-2 py-0.5 text-[10px] font-black text-[#E6C673] whitespace-nowrap ${
                inline ? '' : 'mt-1'
            }`}
            title="موكل المكتب"
        >
            ⚖️ موكل
        </span>
    );
}

/**
 * علامة «📦 N» الصغيرة جوار اسم المتهم — تُفتح/تُغلق الكاشف.
 */
export function SeizedAssetsInlineMark({
    count,
    expanded,
    onToggle,
}: {
    count: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-black whitespace-nowrap transition ${
                expanded
                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-50'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'
            }`}
            aria-expanded={expanded}
            title={expanded ? 'إخفاء قائمة المحجوزات' : 'عرض قائمة المحجوزات'}
        >
            📦 {count}
        </button>
    );
}

export function ProfileReadOnlyField({
    label,
    value,
    muted = false,
}: {
    label: string;
    value: string;
    muted?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-700/80 bg-slate-800/25 px-3 py-2.5 text-right">
            <div className="text-white/55 text-xs font-black mb-1 text-right whitespace-normal break-words">
                {label}
            </div>
            <div
                className={`text-sm font-bold whitespace-normal break-words leading-relaxed ${
                    muted ? 'text-white/40' : 'text-white'
                }`}
            >
                {value}
            </div>
        </div>
    );
}
