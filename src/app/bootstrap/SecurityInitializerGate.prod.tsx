import React, { Suspense } from 'react';

const SecurityInitializerLazy = React.lazy(() =>
    import('@/app/security/SecurityInitializer').then((m) => ({ default: m.SecurityInitializer })),
);

export function SecurityInitializerGate() {
    return (
        <Suspense fallback={null}>
            <SecurityInitializerLazy />
        </Suspense>
    );
}
