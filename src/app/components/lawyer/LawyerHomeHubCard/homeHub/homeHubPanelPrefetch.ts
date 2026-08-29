/** تسخين مقطع التثبيت قبل النقرة — لا يستورد المقطع بشكل ثابت حتى لا يدخل صدفة البطاقة. */
export function prefetchHomeHubPinsPanel(): void {
    void import('../components/HomeHubPinsPanel');
}
