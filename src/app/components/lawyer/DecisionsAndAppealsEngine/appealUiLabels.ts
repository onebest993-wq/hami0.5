import type { ExecutionFile } from '@/app/types/execution';
import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';

export type AppealUiPerspective = 'creditor_agent' | 'debtor_agent';

export function resolveAppealUiPerspective(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined
): AppealUiPerspective {
    return isLawyerRepresentingDebtor(executionData) ? 'debtor_agent' : 'creditor_agent';
}

/** زر/سجل تمييز بعد قبول تظلم الطرف الآخر */
export function appealCassationEntryLabels(
    perspective: AppealUiPerspective,
    party: 'debtor' | 'lawyer'
): { button: string; timelineTitle: string; timelineDescription: string } {
    if (party === 'debtor') {
        if (perspective === 'debtor_agent') {
            return {
                button: 'تمييز قرار المنفذ',
                timelineTitle: 'تمييز قرار المنفذ',
                timelineDescription: 'سُجِّل تمييز وكيل المدين على قرار المنفذ.',
            };
        }
        return {
            button: 'قام المدين بتمييز القرار',
            timelineTitle: 'قام المدين بتمييز القرار',
            timelineDescription: 'سُجِّل تمييز المدين على قرار المنفذ.',
        };
    }
    if (perspective === 'debtor_agent') {
        return {
            button: 'قام الدائن بتمييز القرار',
            timelineTitle: 'قام الدائن بتمييز القرار',
            timelineDescription: 'سُجِّل تمييز وكيل الدائن على قرار المنفذ.',
        };
    }
    return {
        button: 'تمييز القرار',
        timelineTitle: 'تمييز القرار',
        timelineDescription: 'سُجِّل تمييز وكيل الدائن على قرار المنفذ.',
    };
}

export function appealInitialGrievanceTimeline(
    perspective: AppealUiPerspective,
    actor: 'lawyer' | 'debtor'
): string {
    if (actor === 'debtor') {
        return perspective === 'debtor_agent'
            ? 'تم تسجيل تظلم موكّل المدين على القرار.'
            : 'تم تسجيل تظلم المدين على القرار.';
    }
    return perspective === 'debtor_agent'
        ? 'تم تسجيل تظلم الدائن على القرار.'
        : 'تم تسجيل تظلم وكيل الدائن على القرار.';
}

export function appealInitialCassationTimeline(
    perspective: AppealUiPerspective,
    actor: 'lawyer' | 'debtor'
): string {
    if (actor === 'debtor') {
        return perspective === 'debtor_agent'
            ? 'تم تسجيل تمييز موكّل المدين على القرار.'
            : 'تم تسجيل تمييز المدين على القرار.';
    }
    return perspective === 'debtor_agent'
        ? 'تم تسجيل تمييز الدائن على القرار.'
        : 'تم تسجيل تمييز وكيل الدائن على القرار.';
}

export function appealDirectCassationButtonLabel(
    perspective: AppealUiPerspective,
    cassationOnly: boolean
): string {
    if (perspective === 'debtor_agent') {
        return cassationOnly ? 'ميّز قرار المنفذ' : 'ميّز قرار المنفذ مباشرة';
    }
    return cassationOnly ? 'ميّز القرار' : 'ميّز القرار مباشرة';
}

/** زر تسجيل التظلم الأولي — حسب المتضرر ومنظور العرض */
export function appealInitialGrievanceEntryButtonLabel(
    perspective: AppealUiPerspective,
    actor: 'lawyer' | 'debtor'
): string {
    if (perspective === 'debtor_agent') {
        return actor === 'debtor' ? 'سجل تظلم موكّلنا' : 'قام الدائن بالطعن';
    }
    return actor === 'debtor' ? 'قام المدين بالطعن' : 'سجل تظلماً';
}

/** زر التمييز المباشر — حسب المتضرر ومنظور العرض */
export function appealInitialCassationEntryButtonLabel(
    perspective: AppealUiPerspective,
    actor: 'lawyer' | 'debtor',
    cassationOnly: boolean
): string {
    if (perspective === 'debtor_agent' && actor === 'lawyer') {
        return cassationOnly
            ? appealCassationEntryLabels(perspective, 'lawyer').button
            : 'قام الدائن بتمييز القرار مباشرة';
    }
    if (perspective === 'debtor_agent' && actor === 'debtor') {
        return appealDirectCassationButtonLabel(perspective, cassationOnly);
    }
    if (perspective === 'creditor_agent' && actor === 'debtor') {
        return cassationOnly
            ? appealCassationEntryLabels(perspective, 'debtor').button
            : 'قام المدين بتمييز القرار مباشرة';
    }
    return appealDirectCassationButtonLabel(perspective, cassationOnly);
}

export function appealDebtorGrievanceNoticeLabel(perspective: AppealUiPerspective): string {
    return perspective === 'debtor_agent'
        ? 'تم تسجيل تظلم موكّلنا على القرار'
        : 'قام المدين بالطعن بالقرار';
}

/** وكيل الدائن — قرار منفذ لصالح الدائن: الطعن للمدين فقط */
export function appealCreditorAgentDebtorHarmedNotice(): string {
    return 'الطعن متاح للمدين فقط — لا إجراء مطلوب من وكيل الدائن';
}

export function appealExecutorSideDebtorPathLabel(perspective: AppealUiPerspective): string {
    return perspective === 'debtor_agent'
        ? 'طعن موكّلنا بالقرار'
        : 'قام المدين بالطعن بالقرار';
}

export function appealLawyerCassationAutoEntryDescription(perspective: AppealUiPerspective): string {
    return perspective === 'debtor_agent'
        ? 'سُجِّل تمييز الدائن على قرار المنفذ.'
        : 'سُجِّل تمييز وكيل الدائن على قرار المنفذ.';
}

export type AppealPauseGateMessageOpts = {
    /** الدائن/المدين سجّل تمييزاً والملف قيد البت */
    cassationFiled?: boolean;
};

/** رسالة إيقاف طلب الدائن بعد قبول تظلم المدين */
export function appealCreditorRequestPauseGateMessage(
    perspective: AppealUiPerspective,
    opts: AppealPauseGateMessageOpts = {}
): string {
    if (perspective === 'debtor_agent') {
        if (opts.cassationFiled) {
            return 'قُبل تظلم موكّلنا — الدائن سجّل تمييزاً والقرار قيد البت لدى محكمة التمييز.';
        }
        return 'قُبل تظلم موكّلنا — الطلب موقوف مؤقتاً حتى يسجّل الدائن تمييزاً أو يستغني عنه.';
    }
    if (opts.cassationFiled) {
        return 'قُبل تظلم المدين — التمييز مسجّل والقرار قيد البت لدى محكمة التمييز.';
    }
    return 'قُبل تظلم المدين — الطلب مغلق مؤقتاً (لم يُلغَ). سجّل التمييز أدناه أو اختر «لا حاجة للتمييز».';
}

/** رسالة إغلاق دورة طلب الدائن بعد قبول تظلم المدين */
export function appealCreditorRequestRevokedGateMessage(
    perspective: AppealUiPerspective,
    waived: boolean
): string {
    if (perspective === 'debtor_agent') {
        return waived
            ? 'قُبل تظلم موكّلنا دون تمييز من الدائن — طلب الدائن مُختوم وحسوم.'
            : 'قُبل تظلم موكّلنا — انتهت دورة طلب الدائن.';
    }
    return waived
        ? 'قُبل تظلم المدين دون تمييز — الطلب مُختوم وحسوم ولا يتطلب إجراءاً إضافياً.'
        : 'قُبل تظلم المدين — انتهت دورة الطلب.';
}

/** تسمية الطاعن في ملخص مسار الطعن */
/** هل نتيجة الطعن لصالح موكّل المدين — بمنظور وكيل المدين */
export function isAppealResultFavorableToDebtorClient(
    result: string,
    appealActor: 'lawyer' | 'debtor' | null | undefined
): boolean {
    const actor = appealActor ?? null;
    const r = String(result || '').trim();
  if (r === 'قبول التظلم') return actor === 'debtor';
    if (r === 'رد التظلم') return actor === 'lawyer';
    if (r === 'نقض القرار') return actor === 'lawyer';
    if (r === 'تصديق القرار' || r === 'رد اللائحة') return actor === 'debtor';
    return false;
}

export function appealAppellantDisplayLabel(
    raw: string,
    perspective: AppealUiPerspective
): string {
    const label = String(raw ?? '').trim();
    if (!label || label === '—') return label;
    if (label.includes('،')) {
        return label
            .split('،')
            .map((part) => appealAppellantDisplayLabel(part.trim(), perspective))
            .join('، ');
    }
    if (perspective === 'debtor_agent' && (label === 'المدين' || label === 'موكّل المدين')) {
        return 'موكّلنا';
    }
    return label;
}

/** إعادة صياغة سجل الطعن الخام بمنظور وكيل المدين */
export function appealRelabelTimelineMessage(
    message: string,
    perspective: AppealUiPerspective = 'creditor_agent'
): string {
    if (perspective !== 'debtor_agent') return message;
    let m = String(message || '').trim();
    if (!m) return m;
    m = m.replace(/تم تسجيل تظلم وكيل الدائن/g, 'تم تسجيل تظلم الدائن');
    m = m.replace(/تم تسجيل تظلم موكّل المدين/g, 'تم تسجيل تظلم موكّلنا');
    m = m.replace(/تم تسجيل تظلم المدين/g, 'تم تسجيل تظلم موكّلنا');
    m = m.replace(/سُجِّل تمييز وكيل المدين/g, 'سُجِّل تمييز موكّلنا');
    m = m.replace(/سُجِّل تمييز المدين/g, 'سُجِّل تمييز موكّلنا');
    m = m.replace(/تمييز وكيل الدائن/g, 'تمييز الدائن');
    m = m.replace(/قُبل التظلم — يتاح للطرف الآخر التمييز/g, 'قُبل تظلم موكّلنا — بانتظار تمييز الدائن');
    m = m.replace(/قُبل التظلم/g, 'قُبل تظلم موكّلنا');
    m = m.replace(/رُد التظلم — بقي القرار الأصلي نافذاً/g, 'رُد تظلم الدائن — الطلب لصالح موكّلنا');
    m = m.replace(/رُد التظلم/g, 'رُد التظلم');
    m = m.replace(/طلب المدين مقبول/g, 'طلب موكّلنا مقبول');
    m = m.replace(/طلب المدين مرفوض/g, 'طلب موكّلنا مرفوض');
    m = m.replace(/طلب الدائن\/تنفيذ مقبول/g, 'طلب الدائن مقبول — ضد موكّلك');
    m = m.replace(/طلب الدائن\/تنفيذ مرفوض/g, 'طلب الدائن مرفوض — لصالح موكّلك');
    return m;
}

/** ألوان أزرار محكمة التمييز — لصالح/ضد موكّل المدين */
export function cassationCourtButtonClass(
    perspective: AppealUiPerspective,
    appealActor: 'lawyer' | 'debtor' | null,
    choice: 'rad_laheeza' | 'naqd'
): string {
    const base =
        'px-4 py-2 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40';
    if (perspective !== 'debtor_agent' || !appealActor) {
        return choice === 'rad_laheeza'
            ? `${base} bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500/35`
            : `${base} bg-purple-600 hover:bg-purple-700 text-white focus-visible:ring-purple-500/35`;
    }
    const result = choice === 'rad_laheeza' ? 'تصديق القرار' : 'نقض القرار';
    const favorable = isAppealResultFavorableToDebtorClient(result, appealActor);
    if (favorable) {
        return `${base} bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/35`;
    }
    return choice === 'rad_laheeza'
        ? `${base} bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-500/35`
        : `${base} bg-violet-600 hover:bg-violet-700 text-white focus-visible:ring-violet-500/35`;
}
