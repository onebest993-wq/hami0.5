export const RequestsEntryModalReadOnlyField = ({
    label,
    value,
}: {
    label: string;
    value: string;
}) => (
    <div className="flex items-start justify-between gap-3 py-1 min-w-0 border-b border-white/[0.06] last:border-0">
        <span className="text-[#A0AEC0] text-[10px] font-light shrink-0 pt-0.5">{label}</span>
        <span className="text-white/95 text-[11px] font-medium text-left whitespace-normal break-words min-w-0 flex-1">
            {value.trim() || '—'}
        </span>
    </div>
);
