import { useCallback, useEffect, useRef } from 'react';
import { invokeMaybeStubFunctionOrWait } from './executionHandlerClusterStubs';

export function useExecutionFollowupModalLiveHandlers(params: {
    handleDossierAction: ((payload: unknown) => unknown) | undefined;
    runSpecialFollowupSubmit: (() => unknown) | undefined;
    isRepresentingDebtor: boolean | undefined;
    showToast: (message: string, type?: string) => void;
    setDossierActionModalSaving: (saving: boolean) => void;
}) {
    const {
        handleDossierAction,
        runSpecialFollowupSubmit,
        isRepresentingDebtor,
        showToast,
        setDossierActionModalSaving,
    } = params;

    const handleDossierActionRef = useRef(handleDossierAction);
    const runSpecialFollowupSubmitRef = useRef(runSpecialFollowupSubmit);
    useEffect(() => {
        handleDossierActionRef.current = handleDossierAction;
    }, [handleDossierAction]);
    useEffect(() => {
        runSpecialFollowupSubmitRef.current = runSpecialFollowupSubmit;
    }, [runSpecialFollowupSubmit]);

    const handleSpecialFollowupSubmit = useCallback(() => {
        if (isRepresentingDebtor) {
            showToast('غير متاح لوكيل المدين: طلبات الإدارة الخاصة', 'warning');
            return undefined;
        }
        const immediate = runSpecialFollowupSubmitRef.current;
        if (typeof immediate === 'function') {
            return immediate();
        }
        return invokeMaybeStubFunctionOrWait(
            'dossierFollowupHandlers.runSpecialFollowupSubmit',
            [],
            { readLive: () => runSpecialFollowupSubmitRef.current },
        );
    }, [isRepresentingDebtor, showToast]);

    const safeHandleDossierAction = useCallback(
        async (payload: unknown) => {
            const immediate = handleDossierActionRef.current;
            if (typeof immediate === 'function') {
                return await immediate(payload);
            }
            const result = await Promise.resolve(
                invokeMaybeStubFunctionOrWait('dossierFollowupHandlers.handleDossierAction', [payload], {
                    readLive: () => handleDossierActionRef.current,
                }),
            );
            if (result === false) {
                setDossierActionModalSaving(false);
            }
            return result;
        },
        [setDossierActionModalSaving],
    );

    return {
        handleSpecialFollowupSubmit,
        safeHandleDossierAction,
    };
}
