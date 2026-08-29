import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { Party, ThirdParty } from './types';
import {
    clearClientFromParty,
    clearClientFromThirdParty,
    markPartyAsClient,
    markThirdPartyAsClient,
    otherSideHasClient,
} from './partyClientFlags';

type PartyHandlersDeps = {
    parties1: Party[];
    parties2: Party[];
    thirdParties: ThirdParty[];
    setParties1: Dispatch<SetStateAction<Party[]>>;
    setParties2: Dispatch<SetStateAction<Party[]>>;
    setThirdParties: Dispatch<SetStateAction<ThirdParty[]>>;
    setErrorMap: Dispatch<SetStateAction<Record<string, string>>>;
};

export function useLawyerNewCasePartyHandlers({
    parties1,
    parties2,
    thirdParties,
    setParties1,
    setParties2,
    setThirdParties,
    setErrorMap,
}: PartyHandlersDeps) {
    const clearLawyerClientError = useCallback(() => {
        setErrorMap((prev) => {
            if (!prev.lawyer_client) return prev;
            const next = { ...prev };
            delete next.lawyer_client;
            return next;
        });
    }, [setErrorMap]);

    const clearClientsOnSide = useCallback(
        (side: 1 | 2) => {
            const wipeParty = (p: Party): Party => ({
                ...p,
                isClient: false,
                isMyOffice: false,
                lawyerName: p.isMyOffice ? '' : (p.lawyerName ?? ''),
            });
            if (side === 1) setParties1((prev) => prev.map(wipeParty));
            else setParties2((prev) => prev.map(wipeParty));
            setThirdParties((prev) =>
                prev.map((tp) => {
                    if (tp.isClient && tp.entryMode === 'affiliative' && tp.affiliatedSide === side) {
                        return { ...tp, isClient: false, isMyOffice: false, lawyerName: '' };
                    }
                    return tp;
                }),
            );
        },
        [setParties1, setParties2, setThirdParties],
    );

    const addParty = useCallback(
        (side: 1 | 2) => {
            const newParty: Party = {
                id: `${side === 1 ? 'p1' : 'p2'}_${Date.now()}`,
                name: '',
                status: '',
                isClient: false,
                phone: '',
                address: '',
                hasLawyer: false,
                lawyerName: '',
                lawyerPhone: '',
                isMyOffice: false,
            };
            if (side === 1) setParties1((prev) => [...prev, newParty]);
            else setParties2((prev) => [...prev, newParty]);
        },
        [setParties1, setParties2],
    );

    const removeParty = useCallback(
        (side: 1 | 2, id: string) => {
            if (side === 1) {
                setParties1((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
            } else {
                setParties2((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
            }
        },
        [setParties1, setParties2],
    );

    const updateParty = useCallback(
        (side: 1 | 2, id: string, field: keyof Party, value: string | boolean) => {
            if (field === 'isClient' && value === true) {
                clearLawyerClientError();
                setParties1((prev) =>
                    prev.map((p) =>
                        side === 1 && p.id === id ? markPartyAsClient(p) : clearClientFromParty(p),
                    ),
                );
                setParties2((prev) =>
                    prev.map((p) =>
                        side === 2 && p.id === id ? markPartyAsClient(p) : clearClientFromParty(p),
                    ),
                );
                setThirdParties((prev) => prev.map(clearClientFromThirdParty));
                return;
            }

            if (field === 'isClient' && value === false) {
                const updater = (prev: Party[]) =>
                    prev.map((p) => (p.id === id ? clearClientFromParty(p) : p));
                if (side === 1) setParties1(updater);
                else setParties2(updater);
                return;
            }

            if (field === 'isMyOffice' && value === true) {
                if (otherSideHasClient(side, parties1, parties2, thirdParties)) {
                    SmartToast.error('⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!');
                    return;
                }
                clearClientsOnSide(side === 1 ? 2 : 1);
            }

            const updater = (prev: Party[]) =>
                prev.map((p) => {
                    if (p.id !== id) return p;
                    if (field === 'isMyOffice' && value === true) {
                        return {
                            ...p,
                            isMyOffice: true,
                            isClient: true,
                            lawyerName: 'مكتبي (الوكيل الأصيل)',
                        };
                    }
                    if (field === 'isMyOffice' && value === false) {
                        return { ...p, isMyOffice: false, lawyerName: '' };
                    }
                    return { ...p, [field]: value };
                });
            if (side === 1) setParties1(updater);
            else setParties2(updater);
        },
        [
            clearClientsOnSide,
            clearLawyerClientError,
            parties1,
            parties2,
            setParties1,
            setParties2,
            setThirdParties,
            thirdParties,
        ],
    );

    const handleAddThirdParty = useCallback(
        (party: ThirdParty) => setThirdParties((prev) => [...prev, party]),
        [setThirdParties],
    );

    const removeThirdParty = useCallback(
        (id: number) => setThirdParties((prev) => prev.filter((tp) => tp.id !== id)),
        [setThirdParties],
    );

    const updateThirdParty = useCallback(
        (id: number, field: keyof ThirdParty, value: string | boolean | number) => {
            const target = thirdParties.find((tp) => tp.id === id);
            if (!target) return;

            if (field === 'isClient' && value === true) {
                clearLawyerClientError();
                setParties1((prev) => prev.map(clearClientFromParty));
                setParties2((prev) => prev.map(clearClientFromParty));
                setThirdParties((prev) =>
                    prev.map((tp) =>
                        tp.id === id ? markThirdPartyAsClient(tp) : clearClientFromThirdParty(tp),
                    ),
                );
                return;
            }

            if (field === 'isClient' && value === false) {
                setThirdParties((prev) =>
                    prev.map((tp) => (tp.id === id ? clearClientFromThirdParty(tp) : tp)),
                );
                return;
            }

            if (field === 'isMyOffice' && value === true) {
                const side = target.affiliatedSide;
                if (side && otherSideHasClient(side, parties1, parties2, thirdParties)) {
                    SmartToast.error('⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!');
                    return;
                }
                if (side) clearClientsOnSide(side === 1 ? 2 : 1);
            }

            setThirdParties((prev) =>
                prev.map((tp) => {
                    if (tp.id !== id) return tp;
                    if (field === 'isMyOffice' && value === true) {
                        return {
                            ...tp,
                            isMyOffice: true,
                            isClient: true,
                            lawyerName: 'مكتبي (الوكيل الأصيل)',
                        };
                    }
                    if (field === 'isMyOffice' && value === false) {
                        return { ...tp, isMyOffice: false, lawyerName: '' };
                    }
                    return { ...tp, [field]: value };
                }),
            );
        },
        [
            clearClientsOnSide,
            clearLawyerClientError,
            parties1,
            parties2,
            setParties1,
            setParties2,
            setThirdParties,
            thirdParties,
        ],
    );

    return {
        addParty,
        removeParty,
        updateParty,
        handleAddThirdParty,
        removeThirdParty,
        updateThirdParty,
    };
}
