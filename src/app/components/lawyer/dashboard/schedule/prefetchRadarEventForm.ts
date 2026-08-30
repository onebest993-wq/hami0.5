/** مصدر واحد لمقطع EventForm — الرادار الكسول والتحميل المسبق يشاركان نفس الاستيراد */
export function loadRadarEventFormModule(): Promise<typeof import('@/app/components/lawyer/SmartLegalRadar/EventForm')> {
    return import('@/app/components/lawyer/SmartLegalRadar/EventForm');
}

/** تحميل نموذج الموعد مسبقاً — لا يُستورد EventForm ثابتاً إلى جذع الرادار أو قشرة الفتح */
export function prefetchRadarEventForm(): void {
    void loadRadarEventFormModule();
}
