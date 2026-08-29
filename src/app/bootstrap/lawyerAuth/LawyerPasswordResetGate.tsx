import { Suspense, type ReactElement } from 'react';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

const LazyLawyerPasswordResetForm = lazyWithRetry(() =>
    import('@/app/bootstrap/lawyerAuth/LawyerPasswordResetForm').then((m) => ({
        default: m.LawyerPasswordResetForm as unknown as LazyComponent,
    })),
);

type LawyerPasswordResetGateProps = {
    onCompleted: () => void;
    onCancelToLogin: () => void;
};

export function LawyerPasswordResetGate({
    onCompleted,
    onCancelToLogin,
}: LawyerPasswordResetGateProps): ReactElement {
    return (
        <Suspense fallback={null}>
            <LazyLawyerPasswordResetForm onCompleted={onCompleted} onCancelToLogin={onCancelToLogin} />
        </Suspense>
    );
}
