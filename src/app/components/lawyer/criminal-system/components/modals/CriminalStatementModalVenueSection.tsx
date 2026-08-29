import {
    STATEMENT_RECORDING_PLACE_OPTIONS,
    type StatementRecordingPlace,
} from '../../statementRecordingPlaceEngine';

export type CriminalStatementModalVenueSectionProps = {
    showStatementPlacePicker: boolean;
    statementRecordingPlace: StatementRecordingPlace | '';
    setStatementRecordingPlace: (place: StatementRecordingPlace | '') => void;
    setStatementIsRatified: (value: boolean) => void;
    showRatificationCheckbox: boolean;
    statementIsRatified: boolean;
};

export function CriminalStatementModalVenueSection({
    showStatementPlacePicker,
    statementRecordingPlace,
    setStatementRecordingPlace,
    setStatementIsRatified,
    showRatificationCheckbox,
    statementIsRatified,
}: CriminalStatementModalVenueSectionProps) {
    return (
        <>
            {showStatementPlacePicker ? (
                <div>
                    <label className="block text-white/70 text-xs mb-2 whitespace-normal break-words">
                        مكان الإفادة
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {STATEMENT_RECORDING_PLACE_OPTIONS.map((opt) => {
                            const active = statementRecordingPlace === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        setStatementRecordingPlace(opt.value);
                                        if (opt.value === 'investigation_officer') {
                                            setStatementIsRatified(false);
                                        }
                                    }}
                                    className={`rounded-xl border px-2.5 py-2 text-[11px] font-black transition whitespace-normal break-words ${
                                        active
                                            ? 'border-[#E6C673]/70 bg-[#E6C673]/15 text-[#E6C673]'
                                            : 'border-slate-600/60 bg-slate-900/40 text-white/75 hover:text-white hover:border-slate-500'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {showRatificationCheckbox ? (
                <div className="rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/5 p-3">
                    <label className="flex items-center gap-2 text-white/90 text-sm font-black whitespace-normal break-words">
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#E6C673]"
                            checked={statementIsRatified}
                            onChange={(e) => setStatementIsRatified(e.target.checked)}
                        />
                        تم تصديق أقواله قضائياً
                    </label>
                </div>
            ) : null}
        </>
    );
}
