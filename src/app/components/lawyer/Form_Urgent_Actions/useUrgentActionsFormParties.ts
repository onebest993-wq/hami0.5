import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { UrgentPartyEntry } from './urgentActionsFormTypes';

const EMPTY_PARTY1: UrgentPartyEntry = {
    name: '',
    type: 'person',
    phone: '',
    address: '',
    isRepresented: false,
};
const EMPTY_PARTY2: UrgentPartyEntry = {
    name: '',
    type: 'person',
    address: '',
    isRepresented: false,
    isClient: false,
};

const ORDINAL_NAMES = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'];

export function useUrgentActionsFormParties() {
    const isMountedRef = useRef(true);
    const rafIdsRef = useRef<number[]>([]);
    const party1EndRef = useRef<HTMLDivElement | null>(null);
    const party2EndRef = useRef<HTMLDivElement | null>(null);

    const [party1List, setParty1List] = useState<UrgentPartyEntry[]>([{ ...EMPTY_PARTY1 }]);
    const [party2List, setParty2List] = useState<UrgentPartyEntry[]>([{ ...EMPTY_PARTY2 }]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            rafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
            rafIdsRef.current = [];
        };
    }, []);

    const scrollTo = (target: RefObject<HTMLDivElement | null>) => {
        const rafId = requestAnimationFrame(() => {
            if (!isMountedRef.current) return;
            target.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        rafIdsRef.current.push(rafId);
    };

    const addParty1 = () => {
        setParty1List((prev) => [...prev, { ...EMPTY_PARTY1 }]);
        scrollTo(party1EndRef);
    };
    const addParty2 = () => {
        setParty2List((prev) => [...prev, { ...EMPTY_PARTY2 }]);
        scrollTo(party2EndRef);
    };

    const removeParty1 = (index: number) => {
        setParty1List((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    };
    const removeParty2 = (index: number) => {
        setParty2List((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    };

    const updateParty1 = <K extends keyof UrgentPartyEntry>(index: number, field: K, value: UrgentPartyEntry[K]) => {
        setParty1List((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };
    const updateParty2 = <K extends keyof UrgentPartyEntry>(index: number, field: K, value: UrgentPartyEntry[K]) => {
        setParty2List((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const setPartyRepresented = (side: 'party1' | 'party2', index: number, nextValue: boolean) => {
        if (side === 'party1') {
            setParty1List((prev) => prev.map((p, i) => (i === index ? { ...p, isRepresented: nextValue } : p)));
            if (nextValue) setParty2List((prev) => prev.map((p) => ({ ...p, isRepresented: false, isClient: false })));
            return;
        }
        setParty2List((prev) =>
            prev.map((p, i) => (i === index ? { ...p, isRepresented: nextValue, isClient: nextValue } : p)),
        );
        if (nextValue) setParty1List((prev) => prev.map((p) => ({ ...p, isRepresented: false })));
    };

    const toggleSideClient = (side: 'party1' | 'party2', next: boolean) => {
        if (side === 'party1') {
            if (next) {
                setPartyRepresented('party1', 0, true);
                return;
            }
            const idx = party1List.findIndex((p) => p.isRepresented);
            if (idx >= 0) setPartyRepresented('party1', idx, false);
            return;
        }
        if (next) {
            setPartyRepresented('party2', 0, true);
            return;
        }
        const idx = party2List.findIndex((p) => p.isRepresented);
        if (idx >= 0) setPartyRepresented('party2', idx, false);
    };

    const clearParty2ClientMarks = useCallback(() => {
        setParty2List((prev) => prev.map((p) => ({ ...p, isRepresented: false, isClient: false })));
    }, []);

    const partyCardTitle = (side: 'party1' | 'party2', index: number) => {
        const list = side === 'party1' ? party1List : party2List;
        if (index === 0 && list.length === 1) return '';
        return ORDINAL_NAMES[index] ?? String(index + 1);
    };

    return {
        party1List,
        party2List,
        party1EndRef,
        party2EndRef,
        addParty1,
        removeParty1,
        updateParty1,
        addParty2,
        removeParty2,
        updateParty2,
        toggleSideClient,
        clearParty2ClientMarks,
        partyCardTitle,
        isParty1Client: party1List.some((p) => p.isRepresented),
        isParty2Client: party2List.some((p) => p.isRepresented),
    };
}
