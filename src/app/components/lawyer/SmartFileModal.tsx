import React, { Suspense, lazy } from 'react';
import type { SmartFileModalProps } from './smart-modal/SmartFileModalContent';

const SmartFileModalContent = lazy(() =>
    import('./smart-modal/SmartFileModalContent').then((m) => ({ default: m.SmartFileModalContent })),
);

export type { SmartFileModalProps } from './smart-modal/SmartFileModalContent';

export const SmartFileModal = (props: SmartFileModalProps) => (
    <Suspense fallback={null}>
        <SmartFileModalContent {...props} />
    </Suspense>
);
