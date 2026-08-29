export function HomeHubEmptyState({
    message,
    testId,
    compact = false,
}: {
    message: string;
    testId?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={
                compact
                    ? 'hami-hub-empty hami-hub-empty--compact min-h-[44px]'
                    : 'hami-hub-empty min-h-[44px]'
            }
            role="status"
            data-testid={testId}
        >
            <p className="hami-hub-empty__text">{message}</p>
        </div>
    );
}
