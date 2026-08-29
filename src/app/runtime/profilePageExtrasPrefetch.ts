/**
 * مقاطع ليست أول طلاء للصفحة الكاملة الفارغة (هيرو + سكة + قنوات + معرض).
 * تُحمَّل بعد تقييم Royal حتى لا تنافس أول فتح، وقبل النقرة إن وُجدت كتل.
 */
export function prefetchProfileCustomBlocksChunk(): void {
    if (typeof window === 'undefined') return;
    void import(
        '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileCustomBlocks'
    ).catch(() => undefined);
}
