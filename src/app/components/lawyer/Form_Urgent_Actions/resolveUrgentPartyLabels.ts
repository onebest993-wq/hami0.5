import { isIqrarRequest, IQRAR_PARTY_LABELS } from './constants';

export type UrgentPartyLabels = { party1: string; party2: string };

export function resolveUrgentPartyLabels(actionType: string): UrgentPartyLabels {
    if (isIqrarRequest(actionType)) {
        return { ...IQRAR_PARTY_LABELS };
    }

    if (actionType.includes('منع السفر')) {
        return { party1: 'طالب المنع', party2: 'المطلوب منعه من السفر' };
    }
    if (
        actionType.includes('إيقاف الإجراءات التنفيذية') ||
        actionType.includes('المزايدة') ||
        actionType.includes('إيقاف صرف مبالغ')
    ) {
        return { party1: 'طالب الإيقاف', party2: 'المطلوب الإيقاف ضده' };
    }
    if (actionType.includes('وضع إشارة عدم تصرف')) {
        return { party1: 'طالب الإشارة', party2: 'المطلوب وضع الإشارة ضده' };
    }
    if (actionType.includes('الحجز الاحتياطي')) {
        return { party1: 'طالب الحجز', party2: 'المطلوب الحجز على أمواله' };
    }

    if (actionType === 'منع السفر الولائي') {
        return { party1: 'طالب المنع', party2: 'المطلوب منعه من السفر' };
    }
    if (actionType === 'الحجز الاحتياطي') {
        return { party1: 'طالب الحجز', party2: 'المطلوب الحجز على أمواله' };
    }
    if (actionType === 'الكشف العقاري' || actionType === 'تثبيت حالة') {
        return { party1: 'طالب الكشف', party2: 'المطلوب الكشف ضده' };
    }
    if (actionType === 'رفع التجاوز') {
        return { party1: 'طالب رفع التجاوز', party2: 'المتجاوز' };
    }
    if (actionType === 'طرد الغاصب المستعجل') {
        return { party1: 'طالب الطرد', party2: 'الغاصب' };
    }

    return { party1: 'طالب القرار (المستدعي)', party2: 'المطلوب ضده' };
}
