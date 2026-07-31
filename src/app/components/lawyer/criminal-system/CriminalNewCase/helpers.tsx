import type { CriminalDefendant, DefendantStatus } from '../criminalStore';
import type { CriminalComplainant } from '../criminalCaseModel';
import { isInvestigationStoredStage } from '../criminalStageRuntimeCore';

export const INPUT_BASE =
    'w-full min-h-[44px] rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.045] to-[#070a14]/80 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#E6C673]/55 focus:shadow-[0_0_0_3px_rgba(230,198,115,0.12)] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';

export const CARD_BASE =
    'bg-[#11162A]/95 border border-white/[0.06] rounded-2xl p-4 shadow-[0_8px_28px_rgba(0,0,0,0.22)]';

export const FIELD_LABEL = 'block text-white/65 text-[11px] font-bold tracking-wide mb-1.5 leading-snug';

const DEFENDANT_FACE_NAME_LABEL = 'اسم المشكو منه / المتهم الوجاهي';

const JUVENILE_COURT_PATTERN = /أحداث/;

export function defendantNameLabel(stage: string, isJuvenile: boolean, isUnderSeven: boolean): string {
    if (isUnderSeven) return 'اسم الصغير';
    if (isJuvenile) {
        return isInvestigationStoredStage(stage) ? 'اسم المشكو منه - حدث' : 'اسم المتهم - حدث';
    }
    return DEFENDANT_FACE_NAME_LABEL;
}

export function defendantStatusLabel(isJuvenile: boolean): string {
    return isJuvenile ? 'حالة الحدث القانونية' : 'حالة المتهم';
}

export function complainantNameLabel(isMinorComplainant: boolean): string {
    if (!isMinorComplainant) return 'الاسم الرباعي';
    return 'اسم المجني عليه (الحدث/الصغير)';
}

export function defendantRoleJuvenileLabel(stage: string, isJuvenile: boolean, isUnderSeven: boolean): string | null {
    if (isUnderSeven) return 'صغير دون 7 سنوات';
    if (!isJuvenile) return null;
    return isInvestigationStoredStage(stage) ? 'المشكو منه - حدث' : 'المتهم - حدث';
}

export function complainantRoleJuvenileLabel(stage: string, isJuvenile: boolean): string | null {
    if (!isJuvenile) return null;
    return isInvestigationStoredStage(stage) ? 'المشتكي - حدث' : 'المجني عليه - حدث';
}

export function isJuvenileCourtNature(courtName: string): boolean {
    return JUVENILE_COURT_PATTERN.test(String(courtName ?? '').trim());
}

export function requiresDetentionExpiryDate(status: DefendantStatus | ''): boolean {
    return status === 'موقوف';
}

export function isMinorComplainant(complainant: CriminalComplainant): boolean {
    return Boolean(complainant.isJuvenile) || Boolean(complainant.isUnderSeven);
}

export function isMinorDefendant(defendant: CriminalDefendant): boolean {
    return Boolean(defendant.isJuvenile) || Boolean(defendant.isUnderSeven);
}

function CheckMarkIcon() {
    return (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
            <path
                d="M3.5 8.2 6.4 11l6.1-6.4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** مربع اختيار زجاجي — بديل checkbox النظامي */
export function PremiumCheckbox({
    checked,
    onChange,
    label,
    className = '',
    testId,
    dense = false,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    className?: string;
    testId?: string;
    /** صف أقصر داخل شريط أزرار الطرف */
    dense?: boolean;
}) {
    return (
        <label
            className={`group flex cursor-pointer items-center touch-manipulation ${
                dense ? 'min-h-[36px] gap-2' : 'min-h-[44px] gap-3'
            } ${className}`}
            data-testid={testId}
        >
            <span
                className={`flex shrink-0 items-center justify-center rounded-md border transition duration-200 ${
                    dense ? 'h-4 w-4 rounded-[5px]' : 'h-5 w-5'
                } ${
                    checked
                        ? 'border-[#E6C673]/70 bg-[#E6C673]/20 text-[#E6C673] shadow-[0_0_12px_rgba(230,198,115,0.18)]'
                        : 'border-white/20 bg-white/[0.03] text-transparent group-hover:border-white/35'
                }`}
                aria-hidden
            >
                <CheckMarkIcon />
            </span>
            <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span
                className={`font-bold leading-snug text-white/85 whitespace-normal break-words ${
                    dense ? 'text-[11px]' : 'text-[12px]'
                }`}
            >
                {label}
            </span>
        </label>
    );
}

/** مفتاح تبديل صفّي (حدث / ربط دليل…) */
export function PremiumSwitchRow({
    label,
    pressed,
    onToggle,
    className = '',
    compact = false,
}: {
    label: string;
    pressed: boolean;
    onToggle: () => void;
    className?: string;
    /** صف أقصر لخيارات الحدث داخل بطاقة الطرف */
    compact?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between gap-2 min-h-[44px] ${className}`}
        >
            <div
                className={`font-bold text-white/80 whitespace-normal break-words leading-snug ${
                    compact ? 'text-[11px]' : 'text-[13px] text-white/85'
                }`}
            >
                {label}
            </div>
            <button
                type="button"
                onClick={onToggle}
                className={`relative inline-flex shrink-0 items-center rounded-full border transition duration-200 touch-manipulation ${
                    compact ? 'h-5 w-9' : 'h-7 w-12'
                } ${
                    pressed
                        ? 'border-[#E6C673]/45 bg-[#E6C673]/25'
                        : 'border-white/15 bg-white/[0.06]'
                }`}
                aria-pressed={pressed}
            >
                <span
                    className={`pointer-events-none absolute rounded-full shadow transition-[inset-inline-start] duration-200 ${
                        compact ? 'top-0.5 h-4 w-4' : 'top-0.5 h-5 w-5'
                    } ${
                        pressed
                            ? compact
                                ? 'start-[1.125rem] bg-[#E6C673]'
                                : 'start-[1.625rem] bg-[#E6C673]'
                            : 'start-0.5 bg-white/85'
                    }`}
                />
            </button>
        </div>
    );
}

/** أزرار اختيار مقطّعة (مركز شرطة / مكتب تحقيق) */
export function SegmentedChoice<T extends string>({
    value,
    options,
    onChange,
    name,
    compact = false,
}: {
    value: T | '' | string;
    options: ReadonlyArray<{ value: T; label: string }>;
    onChange: (next: T) => void;
    name: string;
    /** أزرار مقطّعة أصغر — لا تملأ عرض الصف */
    compact?: boolean;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={name}
            className={
                compact
                    ? 'inline-flex flex-wrap gap-1.5 rounded-xl border border-white/[0.08] bg-black/25 p-1'
                    : 'grid grid-cols-1 gap-2 sm:grid-cols-2 rounded-xl border border-white/[0.08] bg-black/25 p-1.5'
            }
        >
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt.value)}
                        className={`rounded-lg font-black transition duration-200 touch-manipulation ${
                            compact
                                ? 'min-h-[36px] px-3 py-1.5 text-[11px]'
                                : 'min-h-[44px] px-3 py-2 text-[12px]'
                        } ${
                            active
                                ? 'border border-[#E6C673]/40 bg-[#E6C673]/15 text-[#E6C673] shadow-[0_0_16px_rgba(230,198,115,0.12)]'
                                : 'border border-transparent text-white/65 hover:bg-white/[0.05] hover:text-white/90'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

export function UnknownDefendantToggle({
    active,
    onClick,
    disabled = false,
    title,
}: {
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            title={title}
            onClick={onClick}
            className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-[11px] font-black tracking-wide transition duration-200 shrink-0 touch-manipulation ${
                disabled
                    ? 'border-white/10 bg-white/5 text-white/35 cursor-not-allowed'
                    : active
                      ? 'border-rose-400/45 bg-rose-500/15 text-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.15)]'
                      : 'border-white/12 bg-white/[0.04] text-white/70 hover:border-rose-400/35 hover:text-rose-100'
            }`}
            aria-pressed={active}
        >
            مجهول
        </button>
    );
}

export function OfficeClientToggle({
    active,
    onClick,
    disabled = false,
}: {
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            title="موكل المكتب"
            className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-[11px] font-black tracking-wide transition duration-200 shrink-0 touch-manipulation ${
                disabled
                    ? 'border-white/10 bg-white/5 text-white/35 cursor-not-allowed'
                    : active
                      ? 'border-[#E6C673]/55 bg-[#E6C673]/18 text-[#E6C673]'
                      : 'border-white/12 bg-white/[0.04] text-white/70 hover:border-[#E6C673]/35 hover:text-[#E6C673]'
            }`}
            aria-pressed={active}
            data-testid="criminal-office-client-toggle"
        >
            موكل
        </button>
    );
}
