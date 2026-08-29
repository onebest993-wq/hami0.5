import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { saveHidden } from './hiddenBadgeStorage';

/** Unhide dossier-controlled badges when their signal keys rotate. */
export function usePartyBadgeSignalUnhideEffects(params: {
    executionId: string | undefined;
    regularTablighSignalKey: string;
    publicationNoticeSignalKey: string;
    taklifAssignmentSignalKey: string;
    setHiddenLocal: Dispatch<SetStateAction<string[]>>;
}) {
    const {
        executionId,
        regularTablighSignalKey,
        publicationNoticeSignalKey,
        taklifAssignmentSignalKey,
        setHiddenLocal,
    } = params;

    const lastRegularTablighKeyRef = useRef('');
    const lastPublicationKeyRef = useRef('');
    const lastTaklifKeyRef = useRef('');

    useEffect(() => {
        const k = regularTablighSignalKey;
        if (!k) {
            lastRegularTablighKeyRef.current = '';
            return;
        }
        if (lastRegularTablighKeyRef.current && lastRegularTablighKeyRef.current !== k) {
            setHiddenLocal((prev) => {
                const next = prev.filter((id) => id !== 'summons_attendance');
                saveHidden(executionId, next);
                return next;
            });
        }
        lastRegularTablighKeyRef.current = k;
    }, [executionId, regularTablighSignalKey, setHiddenLocal]);

    useEffect(() => {
        const k = publicationNoticeSignalKey;
        if (!k) {
            lastPublicationKeyRef.current = '';
            return;
        }
        if (lastPublicationKeyRef.current && lastPublicationKeyRef.current !== k) {
            setHiddenLocal((prev) => {
                const next = prev.filter((id) => id !== 'publication_notice');
                saveHidden(executionId, next);
                return next;
            });
        }
        lastPublicationKeyRef.current = k;
    }, [executionId, publicationNoticeSignalKey, setHiddenLocal]);

    useEffect(() => {
        const k = taklifAssignmentSignalKey;
        if (!k) {
            lastTaklifKeyRef.current = '';
            return;
        }
        if (lastTaklifKeyRef.current && lastTaklifKeyRef.current !== k) {
            setHiddenLocal((prev) => {
                const next = prev.filter((id) => id !== 'taklif_attendance');
                saveHidden(executionId, next);
                return next;
            });
        }
        lastTaklifKeyRef.current = k;
    }, [executionId, taklifAssignmentSignalKey, setHiddenLocal]);
}
