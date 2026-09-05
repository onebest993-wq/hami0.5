import React, { useCallback } from 'react';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import { dispatchExecutionDossierPrimeHost } from '@/app/runtime/executionDossierPrimeHost';
import { warmExecutionDossierFromArchiveCard } from '../executionArchiveCardIntentWarm';

/**
 * غلاف ثابت حول Suspense — لا يُفك عند استبدال الهيكل بالبطاقة الحيّة،
 * فيبقى pointerdown/up على نفس العقدة.
 */
export function ExecutionArchiveCardOpenShell({
    file,
    onOpen,
    children,
}: {
    file: { id?: string | number } & Record<string, unknown>;
    onOpen: () => void;
    children: React.ReactNode;
}): React.ReactElement {
    const handleIntent = useCallback(
        (event: React.PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest('button,a,[role="checkbox"],input,textarea,select,label')) return;
            const fileId = String(file.id ?? '').trim();
            if (!fileId) return;
            warmExecutionDossierFromArchiveCard('urgent');
            void import('@/app/infrastructure/execution/ExecutionDossierRepository')
                .then((mod) => {
                    mod.readExecutionDossierByIdFromCache(fileId);
                })
                .catch(() => undefined);
            dispatchExecutionDossierPrimeHost({
                ...file,
                type: 'execution',
            });
        },
        [file],
    );

    const press = useScrollSafePress({
        onPress: onOpen,
        onPointerDown: handleIntent,
    });

    return (
        <div
            className="min-w-0"
            data-testid="execution-archive-card-open-shell"
            onPointerDown={press.onPointerDown}
            onPointerMove={press.onPointerMove}
            onPointerUp={press.onPointerUp}
            onPointerCancel={press.onPointerCancel}
            onClick={press.onClick}
        >
            {children}
        </div>
    );
}
