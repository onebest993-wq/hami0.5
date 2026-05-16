const ordinalNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'];

export function ordinalOf(index: number): string {
    return ordinalNames[index] ?? String(index + 1);
}

export function getDynamicPartyLabels(procedureType: string) {
    const t = String(procedureType || '').trim();
    if (t.includes('إقرار')) {
        return {
            party1: 'المُقَر له (المستفيد طالب الإقرار)',
            party2: 'المُقِر (المعترف بالحق)',
        };
    }
    if (t.includes('منع السفر')) return { party1: 'طالب المنع', party2: 'المطلوب منعه من السفر' };
    if (t.includes('إيقاف الإجراءات التنفيذية') || t.includes('المزايدة') || t.includes('إيقاف صرف مبالغ')) {
        return { party1: 'طالب الإيقاف', party2: 'المطلوب الإيقاف ضده' };
    }
    if (t.includes('وضع إشارة عدم تصرف')) return { party1: 'طالب الإشارة', party2: 'المطلوب وضع الإشارة ضده' };
    if (t.includes('الحجز الاحتياطي')) return { party1: 'طالب الحجز', party2: 'المطلوب الحجز على أمواله' };
    return { party1: 'المستدعي', party2: 'المطلوب ضده' };
}
