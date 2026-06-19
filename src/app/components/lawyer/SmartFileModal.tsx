import React, { Suspense, lazy } from 'react';
import type { SmartFileModalProps } from './smart-modal';
import DossierOpeningFallback from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';

const SmartFileModalContent = lazy(() =>
    import('./smart-modal/SmartFileModalContent').then((m) => ({ default: m.SmartFileModalContent })),
);

export type { SmartFileModalProps } from './smart-modal';

export const SmartFileModal = (props: SmartFileModalProps) => {
    const fileId = (props.file as { id?: unknown } | undefined)?.id;
    return (
        <Suspense fallback={<DossierOpeningFallback />}>
            <SmartFileModalContent key={String(fileId ?? 'unknown')} {...props} />
        </Suspense>
    );
};
