import { RequestModalJudicialAppealableToggle } from './RequestModalJudicialAppealableToggle';

export type RequestModalJudicialConcernedPartyFieldProps = {
    customJudicialConcernedParties?: { id: string; label: string }[];
    customJudicialConcernedPartyId?: string;
    onCustomJudicialConcernedPartyChange?: (partyId: string) => void;
};

export function RequestModalJudicialConcernedPartyField({
    customJudicialConcernedParties = [],
    customJudicialConcernedPartyId = '',
    onCustomJudicialConcernedPartyChange,
}: RequestModalJudicialConcernedPartyFieldProps) {
    return (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/30 p-3 space-y-2">
            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                الأمر يخص من
            </label>
            <select
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                value={customJudicialConcernedPartyId}
                onChange={(e) => onCustomJudicialConcernedPartyChange?.(e.target.value.trim())}
            >
                <option value="" className="bg-slate-900 text-white">
                    قرار عام للإضبارة
                </option>
                {customJudicialConcernedParties.map((party) => (
                    <option key={party.id} value={party.id} className="bg-slate-900 text-white">
                        {party.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export type RequestModalJudicialTrialCourtManualFieldsProps = {
    trialCourtManualOnly?: boolean;
    reqTypeTemplate: string;
    reqCustomTypeName: string;
    reqIsAppealable?: boolean;
    onCustomTypeNameChange: (value: string) => void;
    onAppealableChange?: (value: boolean) => void;
    customJudicialConcernedParties?: { id: string; label: string }[];
    customJudicialConcernedPartyId?: string;
    onCustomJudicialConcernedPartyChange?: (partyId: string) => void;
};

export function RequestModalJudicialTrialCourtManualFields({
    trialCourtManualOnly = false,
    reqTypeTemplate,
    reqCustomTypeName,
    reqIsAppealable = false,
    onCustomTypeNameChange,
    onAppealableChange,
    customJudicialConcernedParties = [],
    customJudicialConcernedPartyId = '',
    onCustomJudicialConcernedPartyChange,
}: RequestModalJudicialTrialCourtManualFieldsProps) {
    if (!trialCourtManualOnly) return null;

    /**
     * 🧪 قواعد قانونية (أصول المحاكمات الجزائية):
     *  - «الطلب» لا يُميَّز — التمييز حصرٌ على «القرار القضائي». لذلك لا تَظهر علامة
     *    «قابل للتمييز» داخل حاوية «طلبات المحامي» (lawyer lane).
     *  - أما «القرار اليدوي المخصّص» داخل حاوية «قرارات القاضي» (judicial lane)
     *    فيُمكن أن يكون قابلاً للتمييز — تَبقى العَلامة فيه.
     */
    // Fragment (لا حاوية إضافية) — الـ `space-y-3` يأتي من الحاوية الأم (السماوية/البنفسجية).
    return (
        <>
            <input
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                value={reqCustomTypeName}
                onChange={(e) => onCustomTypeNameChange(e.target.value)}
                placeholder="اسم القرار…"
            />
            <div className="flex">
                <RequestModalJudicialAppealableToggle
                    reqTypeTemplate={reqTypeTemplate}
                    reqIsAppealable={reqIsAppealable}
                    onAppealableChange={onAppealableChange}
                />
            </div>
            <RequestModalJudicialConcernedPartyField
                customJudicialConcernedParties={customJudicialConcernedParties}
                customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                onCustomJudicialConcernedPartyChange={onCustomJudicialConcernedPartyChange}
            />
        </>
    );
}

export type RequestModalJudicialComplaintReferralFieldsProps = {
    reqEntryLane: 'judicial' | 'lawyer' | '';
    show: boolean;
    trialCourtManualOnly?: boolean;
    reqReferredCourtName: string;
    onReferredCourtNameChange: (value: string) => void;
};

export function RequestModalJudicialComplaintReferralFields({
    reqEntryLane,
    show,
    trialCourtManualOnly = false,
    reqReferredCourtName,
    onReferredCourtNameChange,
}: RequestModalJudicialComplaintReferralFieldsProps) {
    if (reqEntryLane !== 'judicial' || !show || trialCourtManualOnly) return null;

    return (
        <>
            <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-3 space-y-2">
                <div className="text-sky-100 text-xs font-black whitespace-normal break-words">
                    المحكمة الجديدة *
                </div>
                <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    value={reqReferredCourtName}
                    onChange={(e) => onReferredCourtNameChange(e.target.value)}
                    placeholder="اسم المحكمة المحال إليها..."
                />
                <p className="text-[10px] font-bold text-white/45 whitespace-normal break-words">
                    يُحدَّث «اسم المحكمة» في ترويسة الإضبارة تلقائياً عند توثيق القرار.
                </p>
            </div>
        </>
    );
}

export type RequestModalJudicialCustomDecisionFieldsProps = {
    reqEntryLane: 'judicial' | 'lawyer' | '';
    show: boolean;
    trialCourtManualOnly?: boolean;
    reqTypeTemplate: string;
    reqCustomTypeName: string;
    reqIsAppealable?: boolean;
    onCustomTypeNameChange: (value: string) => void;
    onAppealableChange?: (value: boolean) => void;
    customJudicialConcernedParties?: { id: string; label: string }[];
    customJudicialConcernedPartyId?: string;
    onCustomJudicialConcernedPartyChange?: (partyId: string) => void;
};

export function RequestModalJudicialCustomDecisionFields({
    reqEntryLane,
    show,
    trialCourtManualOnly = false,
    reqTypeTemplate,
    reqCustomTypeName,
    reqIsAppealable = false,
    onCustomTypeNameChange,
    onAppealableChange,
    customJudicialConcernedParties = [],
    customJudicialConcernedPartyId = '',
    onCustomJudicialConcernedPartyChange,
}: RequestModalJudicialCustomDecisionFieldsProps) {
    if (reqEntryLane !== 'judicial' || !show || trialCourtManualOnly) return null;

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                    اسم القرار اليدوي *
                </label>
                <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    value={reqCustomTypeName}
                    onChange={(e) => onCustomTypeNameChange(e.target.value)}
                />
            </div>
            <div className="flex">
                <RequestModalJudicialAppealableToggle
                    reqTypeTemplate={reqTypeTemplate}
                    reqIsAppealable={reqIsAppealable}
                    onAppealableChange={onAppealableChange}
                />
            </div>
            <RequestModalJudicialConcernedPartyField
                customJudicialConcernedParties={customJudicialConcernedParties}
                customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                onCustomJudicialConcernedPartyChange={onCustomJudicialConcernedPartyChange}
            />
        </div>
    );
}
