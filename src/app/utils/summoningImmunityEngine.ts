/**
 * محرك الحصانة القانونية — التبليغ والإحضار الجبري (إضبارة التنفيذ)
 * قواعد: مهلة الإخبار، الكفيل الضامن، موظف/كاسب، النفقة، المطالبة غير المالية.
 */

import { isGracePeriodExpired } from '@/app/utils/executionStateMachine';

export type EmploymentTypeSummoning = 'موظف' | 'كاسب' | 'متقاعد';
export type MonetaryClaimNature = 'مالي' | 'غير مالي';

export type SummoningBadgeId =
    | 'waiting_notification_period'
    | 'employee_salary_garnishment_only'
    | 'retiree_pension_garnishment_route'
    | 'earner_monetary_seizures_only'
    | 'guarantor_redirect'
    | 'exposed_non_financial'
    | 'exposed_alimony_shortfall'
    | 'warrant_memo_active';

export interface SummoningImmunityInput {
    notificationDate: string | null;
    employmentType: EmploymentTypeSummoning;
    claimNature: MonetaryClaimNature;
    isAlimony: boolean;
    /** true فقط عند التأكد أن الراتب المحجوز يغطي النفقة */
    salaryCoversAlimony: boolean;
    hasGuarantor: boolean;
    /** حضور سابق يعفي من انتظار الـ7 أيام للإحضار اللاحق — دون إلغاء حصانة الموظف/الكفيل */
    hasAttendanceHistory: boolean;
    forcedAttendanceIssued: boolean;
    /** +يوم تقويمي واحد بقرار المحامي (مربع التمديد) */
    graceExtraCalendarDays?: number;
    /**
     * تنفيذ مالي صارم (مبلغ محكوم أو أتعاب، بلا هجين): الكاسب لا يُحضَر جبراً؛ يُكتفى بحجز راتب/عقار/مركبة.
     * النفقة والهجين يُستثنىان في الواجهة عند تمرير false.
     */
    monetaryExecutionStrict?: boolean;
}

export interface SummoningBadge {
    id: SummoningBadgeId;
    label: string;
    className: string;
}

export interface ForcedSummoningAnalysis {
    canForceSummon: boolean;
    lockReasonAr: string;
    badges: SummoningBadge[];
    guarantorReplacementNoteAr?: string;
    employeeReplacementNoteAr?: string;
    calendarGateOpen: boolean;
}

const BADGE = {
    yellow: 'backdrop-blur-sm bg-amber-500/15 text-amber-200 px-2 py-0.5 rounded-lg text-[9px] border border-amber-400/35 font-bold',
    blue: 'backdrop-blur-sm bg-sky-500/15 text-sky-200 px-2 py-0.5 rounded-lg text-[9px] border border-sky-400/35 font-bold',
    purple: 'backdrop-blur-sm bg-purple-500/15 text-purple-200 px-2 py-0.5 rounded-lg text-[9px] border border-purple-400/35 font-bold',
    orange: 'backdrop-blur-sm bg-orange-500/15 text-orange-200 px-2 py-0.5 rounded-lg text-[9px] border border-orange-400/35 font-bold',
    red: 'backdrop-blur-sm bg-red-600/25 text-red-200 px-2 py-0.5 rounded-lg text-[9px] border border-red-400/40 font-bold',
} as const;

function ensureWaitingBadge(badges: SummoningBadge[]) {
    if (!badges.some((b) => b.id === 'waiting_notification_period')) {
        badges.unshift({
            id: 'waiting_notification_period',
            label: 'بانتظار انتهاء مدة الإخبار',
            className: BADGE.yellow,
        });
    }
}

function applyIssuedMemoLock(
    base: ForcedSummoningAnalysis,
    issued: boolean
): ForcedSummoningAnalysis {
    if (!issued) return base;
    const badges = [...base.badges];
    if (!badges.some((b) => b.id === 'warrant_memo_active')) {
        badges.push({
            id: 'warrant_memo_active',
            label: 'مطلوب بمذكرة قبض',
            className: BADGE.red,
        });
    }
    return {
        ...base,
        canForceSummon: false,
        lockReasonAr:
            'صدرت مذكرة إحضار — يُتابع بتأمين الإحضار ومفاتحة محكمة التحقيق وإصدار مذكرة قبض عند اللزوم.',
        badges,
    };
}

/**
 * تحديد إن كان يجوز المضي قانوناً بإحضار المدين جبراً (قبل تفعيل زر «إحضار جبري»).
 */
export function canBeForcefullySummoned(input: SummoningImmunityInput): ForcedSummoningAnalysis {
    const badges: SummoningBadge[] = [];

    if (!input.notificationDate) {
        ensureWaitingBadge(badges);
        return applyIssuedMemoLock(
            {
                canForceSummon: false,
                lockReasonAr:
                    'لا يصح الإحضار الجبري قبل إتمام التبليغ وتحديد تاريخ التبليغ الفعلي.',
                badges,
                calendarGateOpen: false,
            },
            input.forcedAttendanceIssued
        );
    }

    const extraGrace = Math.max(0, input.graceExtraCalendarDays ?? 0);
    const sevenDayPassed = isGracePeriodExpired(input.notificationDate, new Date(), extraGrace);
    const calendarGateOpen = sevenDayPassed || input.hasAttendanceHistory;

    if (!calendarGateOpen) {
        ensureWaitingBadge(badges);
    }

    /** متقاعد: راتب تقاعد — لا إحضار جبري؛ يُفضَّل حجز عبر هيئة التقاعد */
    if (input.employmentType === 'متقاعد') {
        if (!calendarGateOpen) {
            ensureWaitingBadge(badges);
        }
        badges.push({
            id: 'retiree_pension_garnishment_route',
            label: 'متقاعد — مسار حجز راتب التقاعد',
            className: BADGE.blue,
        });
        return applyIssuedMemoLock(
            {
                canForceSummon: false,
                lockReasonAr:
                    'المدين متقاعد ويتقاضى راتب تقاعد؛ يُكتفى بحجز الراتب التقاعدي عبر هيئة التقاعد الوطنية ولا يُفضَّل الإحضار الجبري أو الحبس التنفيذي في هذا المسار.',
                badges,
                employeeReplacementNoteAr: 'يُوجَّه الحجز إلى هيئة التقاعد الوطنية',
                calendarGateOpen,
            },
            input.forcedAttendanceIssued
        );
    }

    // درع الكفيل — دين مالي فقط
    if (input.hasGuarantor && input.claimNature === 'مالي') {
        badges.push({
            id: 'guarantor_redirect',
            label: 'يوجد كفيل ضامن',
            className: BADGE.purple,
        });
        if (!calendarGateOpen) {
            return applyIssuedMemoLock(
                {
                    canForceSummon: false,
                    lockReasonAr:
                        'ينتظر انتهاء مهلة الإخبار. عند وجود كفيل ضامن في المطالبة المالية يُوجَّه الإجراء للكفيل لا للمدين.',
                    badges,
                    guarantorReplacementNoteAr: 'يوجد كفيل ضامن — يوجه الإجراء للكفيل',
                    calendarGateOpen: false,
                },
                input.forcedAttendanceIssued
            );
        }
        return applyIssuedMemoLock(
            {
                canForceSummon: false,
                lockReasonAr:
                    'لا يجوز إحضار المدين جبراً: يوجد كفيل ضامن والمطالبة مالية — يُوجَّه الإجراء للكفيل الضامن.',
                badges,
                guarantorReplacementNoteAr: 'يوجد كفيل ضامن — يوجه الإجراء للكفيل',
                calendarGateOpen: true,
            },
            input.forcedAttendanceIssued
        );
    }

    // موظف + التزام غير مالي → لا حصانة إحضار (مثل التسليم)
    if (input.employmentType === 'موظف' && input.claimNature === 'غير مالي') {
        badges.push({
            id: 'exposed_non_financial',
            label: 'معرض للإحضار — التزام غير مالي',
            className: BADGE.orange,
        });
        if (!calendarGateOpen) {
            return applyIssuedMemoLock(
                {
                    canForceSummon: false,
                    lockReasonAr:
                        'لا يجوز الإحضار الجبري قبل انتهاء مهلة الإخبار (7 أيام عملية من اليوم التالي للتبليغ)، ما لم يثبت حضور المدين سابقاً.',
                    badges,
                    calendarGateOpen: false,
                },
                input.forcedAttendanceIssued
            );
        }
        return applyIssuedMemoLock(
            {
                canForceSummon: true,
                lockReasonAr: '',
                badges,
                calendarGateOpen: true,
            },
            input.forcedAttendanceIssued
        );
    }

    const alimonyShortfallException =
        input.isAlimony && input.salaryCoversAlimony === false;

    if (input.employmentType === 'موظف' && input.claimNature === 'مالي') {
        if (alimonyShortfallException) {
            badges.push({
                id: 'exposed_alimony_shortfall',
                label: 'معرض للإحضار — عجز عن سداد النفقة',
                className: BADGE.orange,
            });
            if (!calendarGateOpen) {
                return applyIssuedMemoLock(
                    {
                        canForceSummon: false,
                        lockReasonAr:
                            'عجز الراتب عن تغطية النفقة يسمح بالإحضار الجبري بعد انتهاء مهلة الإخبار (أو بإثبات حضور سابق يعفي من انتظار المهلة).',
                        badges,
                        calendarGateOpen: false,
                    },
                    input.forcedAttendanceIssued
                );
            }
            return applyIssuedMemoLock(
                {
                    canForceSummon: true,
                    lockReasonAr: '',
                    badges,
                    calendarGateOpen: true,
                },
                input.forcedAttendanceIssued
            );
        }

        if (!calendarGateOpen) {
            ensureWaitingBadge(badges);
        }
        badges.push({
            id: 'employee_salary_garnishment_only',
            label: 'محمي قانونياً — يُكتفى بحجز الراتب',
            className: BADGE.blue,
        });
        return applyIssuedMemoLock(
            {
                canForceSummon: false,
                lockReasonAr:
                    'لا يجوز إحضار الموظف جبراً في الديون المالية؛ يُكتفى بحجز الراتب وفق أحكام التنفيذ.',
                badges,
                employeeReplacementNoteAr: 'يُكتفى بحجز الراتب',
                calendarGateOpen,
            },
            input.forcedAttendanceIssued
        );
    }

    // كاسب + مطالبة مالية ضمن تنفيذ مالي صارم: لا إحضار جبري ولا سلوك القبض — حجز راتب/عقار/مركبة
    const monetaryStrict = input.monetaryExecutionStrict === true;
    if (
        monetaryStrict &&
        !input.isAlimony &&
        input.employmentType === 'كاسب' &&
        input.claimNature === 'مالي'
    ) {
        if (!calendarGateOpen) {
            ensureWaitingBadge(badges);
        }
        badges.push({
            id: 'earner_monetary_seizures_only',
            label: 'تنفيذ مالي — حصر الإجراء بحجز الأموال',
            className: BADGE.blue,
        });
        return applyIssuedMemoLock(
            {
                canForceSummon: false,
                lockReasonAr:
                    'في التنفيذ المالي لا يُحضَّر المدين (كاسب) جبراً ولا يُتَخَذ بحقه قبض؛ يُكتفى بحجز الراتب أو العقار أو المركبة بعد مهلة الإخبار.',
                badges,
                employeeReplacementNoteAr: 'يُكتفى بحجز الراتب/العقار/المركبة',
                calendarGateOpen,
            },
            input.forcedAttendanceIssued
        );
    }

    // كاسب — بدون كفيل مالي (مُعالج) وبدون حصانة موظف
    if (!calendarGateOpen) {
        return applyIssuedMemoLock(
            {
                canForceSummon: false,
                lockReasonAr:
                    'لا يجوز الإحضار الجبري قبل انتهاء مهلة الإخبار (7 أيام من اليوم التالي للتبليغ)، ما لم يثبت حضور المدين سابقاً.',
                badges,
                calendarGateOpen: false,
            },
            input.forcedAttendanceIssued
        );
    }

    return applyIssuedMemoLock(
        {
            canForceSummon: true,
            lockReasonAr: '',
            badges,
            calendarGateOpen: true,
        },
        input.forcedAttendanceIssued
    );
}

export function deriveMonetaryClaimNature(
    claimType: string | undefined,
    explicit?: MonetaryClaimNature | null
): MonetaryClaimNature {
    if (explicit === 'مالي' || explicit === 'غير مالي') return explicit;
    const NON_FINANCIAL = [
        'مشاهدة',
        'استصحاب',
        'مبيت',
        'تخلية مأجور',
        'مطاوعة',
        'تسليم طفل',
        'تسليم ولد',
    ];
    if (NON_FINANCIAL.some((k) => claimType?.includes(k))) return 'غير مالي';
    if (claimType === 'eviction') return 'غير مالي';
    return 'مالي';
}

export function deriveEmploymentType(
    occupation: string | undefined,
    explicit?: EmploymentTypeSummoning | null
): EmploymentTypeSummoning {
    if (explicit === 'موظف' || explicit === 'كاسب' || explicit === 'متقاعد') return explicit;
    const o = (occupation || '').toLowerCase();
    if (o.includes('متقاعد') || o.includes('تقاعد')) return 'متقاعد';
    if (o.includes('موظف') || o.includes('حكومي')) return 'موظف';
    if (o.includes('كاسب') || o.includes('خاص')) return 'كاسب';
    return 'كاسب';
}
