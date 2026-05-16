import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCaseStore, LegalCase } from '@/app/stores/caseStore';
import { normalizeArabic as _normalizeArabicBase } from '@/app/components/lawyer/LawyerShared';
import SecureStoreService from '@/app/services/SecureStoreService';
import { TIMING } from '@/app/utils/constants';

const normalizeArabic = (text: string) => _normalizeArabicBase(text).toLowerCase();

export interface SearchResults {
    cases: LegalCase[];
    clients: { caseId: string; name: string; role: string; caseTitle: string }[];
    notes: { caseId: string; noteId: string; content: string; caseTitle: string }[];
    docs: { caseId: string; docId: string; name: string; caseTitle: string }[];
    hasResults: boolean;
}

export interface UseGlobalSearchReturn {
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    results: SearchResults | null;
    recentSearches: string[];
    handleResultClick: (caseId: string, textToSave: string) => void;
    clearRecent: () => void;
}

const RECENT_SEARCHES_KEY = 'lawyer_recent_searches';
const MAX_RECENT = 5;

export const useGlobalSearch = (onClose: () => void, onNavigateToCase: (caseId: string) => void): UseGlobalSearchReturn => {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const cases = useCaseStore(s => s.cases);

    useEffect(() => {
        const saved = SecureStoreService.getItemSync(RECENT_SEARCHES_KEY);
        if (saved) {
            try {
                const parsed: unknown = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setRecentSearches(
                        parsed.filter((x): x is string => typeof x === 'string')
                    );
                } else {
                    SecureStoreService.deleteItemSync(RECENT_SEARCHES_KEY);
                }
            } catch {
                SecureStoreService.deleteItemSync(RECENT_SEARCHES_KEY);
            }
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, TIMING.SEARCH_DEBOUNCE);
        return () => clearTimeout(timer);
    }, [query]);

    const results = useMemo<SearchResults | null>(() => {
        if (!debouncedQuery.trim()) return null;

        const normalizedQuery = normalizeArabic(debouncedQuery);

        const matchedCases: LegalCase[] = [];
        const matchedClients: { caseId: string; name: string; role: string; caseTitle: string }[] = [];
        const matchedNotes: { caseId: string; noteId: string; content: string; caseTitle: string }[] = [];
        const matchedDocs: { caseId: string; docId: string; name: string; caseTitle: string }[] = [];

        cases.forEach(c => {
            const caseText = `${c.title} ${c.caseNo} ${c.court || ''}`;
            if (normalizeArabic(caseText).includes(normalizedQuery)) {
                matchedCases.push(c);
            }

            const parties = [
                { name: c.clientName, role: 'الموكل' },
                { name: c.opponentName, role: 'الخصم' }
            ];
            parties.forEach(p => {
                if (p.name && normalizeArabic(p.name).includes(normalizedQuery)) {
                    matchedClients.push({
                        caseId: c.id,
                        name: p.name,
                        role: p.role,
                        caseTitle: c.title
                    });
                }
            });

            if (c.notes) {
                c.notes.forEach(n => {
                    if (!n.isDeleted && normalizeArabic(n.content).includes(normalizedQuery)) {
                        matchedNotes.push({
                            caseId: c.id,
                            noteId: n.id,
                            content: n.content,
                            caseTitle: c.title
                        });
                    }
                });
            }

            if (c.linkedDocuments) {
                c.linkedDocuments.forEach(d => {
                    if (!d.isDeleted && normalizeArabic(d.name).includes(normalizedQuery)) {
                        matchedDocs.push({
                            caseId: c.id,
                            docId: d.id,
                            name: d.name,
                            caseTitle: c.title
                        });
                    }
                });
            }
        });

        return {
            cases: matchedCases,
            clients: matchedClients,
            notes: matchedNotes,
            docs: matchedDocs,
            hasResults: matchedCases.length > 0 || matchedClients.length > 0 || matchedNotes.length > 0 || matchedDocs.length > 0
        };
    }, [debouncedQuery, cases]);

    const handleResultClick = useCallback((caseId: string, textToSave: string) => {
        const newRecent = [textToSave, ...recentSearches.filter(s => s !== textToSave)].slice(0, MAX_RECENT);
        setRecentSearches(newRecent);
        SecureStoreService.setItemSync(RECENT_SEARCHES_KEY, JSON.stringify(newRecent));
        onNavigateToCase(caseId);
        onClose();
    }, [recentSearches, onClose, onNavigateToCase]);

    const clearRecent = useCallback(() => {
        setRecentSearches([]);
        SecureStoreService.deleteItemSync(RECENT_SEARCHES_KEY);
    }, []);

    return {
        query,
        setQuery,
        results,
        recentSearches,
        handleResultClick,
        clearRecent
    };
};
