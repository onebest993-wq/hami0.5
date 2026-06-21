import { useCallback, useEffect, useRef, useState } from 'react';
import { clearQuickNoteDraft, loadQuickNoteDraft, saveQuickNoteDraft } from './quickNoteDraft';

const DEBOUNCE_MS = 450;

export function useQuickNoteDraft(userId?: string) {
    const [quickNote, setQuickNoteState] = useState('');
    const hydratedRef = useRef(false);

    useEffect(() => {
        hydratedRef.current = false;
        let cancelled = false;
        void loadQuickNoteDraft(userId).then((draft) => {
            if (cancelled) return;
            setQuickNoteState(draft);
            hydratedRef.current = true;
        });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    useEffect(() => {
        if (!hydratedRef.current || !userId?.trim()) return;
        const timer = window.setTimeout(() => {
            void saveQuickNoteDraft(userId, quickNote);
        }, DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [quickNote, userId]);

    const setQuickNote = useCallback((value: string) => {
        setQuickNoteState(value);
    }, []);

    const clearQuickNote = useCallback(() => {
        setQuickNoteState('');
        void clearQuickNoteDraft(userId);
    }, [userId]);

    return { quickNote, setQuickNote, clearQuickNote };
}
