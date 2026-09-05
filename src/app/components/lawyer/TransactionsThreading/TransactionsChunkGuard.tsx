import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';

/** يمنع سقوط مركز المعاملات إذا فشل مقطع كسول؛ أخطاء الرسم تُبلَّغ ولا تُبتلع صامتة */
export class TransactionsChunkGuard extends Component<
    { children: ReactNode; onFailed: (error: unknown) => void },
    { failed: boolean }
> {
    state = { failed: false };

    static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('transactions-chunk-guard', error, info.componentStack);
        this.props.onFailed(error);
    }

    render(): ReactNode {
        if (this.state.failed) return null;
        return this.props.children;
    }
}

export function TxLazyIsland({
    children,
    onFailed,
}: {
    children: ReactNode;
    onFailed: (error: unknown) => void;
}) {
    return (
        <TransactionsChunkGuard onFailed={onFailed}>
            <Suspense fallback={null}>{children}</Suspense>
        </TransactionsChunkGuard>
    );
}
