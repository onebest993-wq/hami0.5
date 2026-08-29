import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

export const LazyLawyerSignInForm = lazyWithRetry(() =>
    import('@/app/bootstrap/lawyerAuth/LawyerSignInForm').then((m) => ({
        default: m.LawyerSignInForm as unknown as LazyComponent,
    })),
);

export const LazyLawyerRegisterWizard = lazyWithRetry(() =>
    import('@/app/bootstrap/lawyerAuth/LawyerRegisterWizard').then((m) => ({
        default: m.LawyerRegisterWizard as unknown as LazyComponent,
    })),
);

export function prefetchAuthGateForms(): void {
    void import('@/app/bootstrap/lawyerAuth/LawyerSignInForm');
    void import('@/app/bootstrap/lawyerAuth/LawyerRegisterWizard');
}
