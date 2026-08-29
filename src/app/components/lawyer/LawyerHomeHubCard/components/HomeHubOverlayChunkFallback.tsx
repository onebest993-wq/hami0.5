/** حالة تحميل مقطع ورقة «البقية» — بلا تعتيم فارغ (CSS الورقة في المقطع الكسول). */
export function HomeHubOverlayChunkFallback({
    testId,
    label,
}: {
    testId: string;
    label: string;
}) {
    return (
        <div className="sr-only" role="status" aria-live="polite" data-testid={testId}>
            {label}
        </div>
    );
}
