import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { normalizeDebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import { isPartialMoneyInput, stripMoneyGrouping } from '@/app/utils/moneyInput';
import {
    canSetDebtorEntityKind,
    capManualIndependentDebtRaw,
    capManualIndependentLawyerFeesRaw,
    parseMoneyInput,
    readPartyEntityKind,
    resolveLockedDebtorEntityKind,
} from './executionFormUtils';
import type {
    AdditionalCreditorDraft,
    AdditionalDebtorDraft,
    CreditorDraft,
    DebtorDraft,
} from '../types';

export interface UseExecutionCreationPartyActionsParams {
    creditors: CreditorDraft[];
    setCreditors: Dispatch<SetStateAction<CreditorDraft[]>>;
    additionalCreditors: AdditionalCreditorDraft[];
    setAdditionalCreditors: Dispatch<SetStateAction<AdditionalCreditorDraft[]>>;
    debtors: DebtorDraft[];
    setDebtors: Dispatch<SetStateAction<DebtorDraft[]>>;
    additionalDebtorsForm: AdditionalDebtorDraft[];
    setAdditionalDebtorsForm: Dispatch<SetStateAction<AdditionalDebtorDraft[]>>;
    allowMultipleDebtors: boolean;
    debtorManualDebtClaims: Record<string, string>;
    setDebtorManualDebtClaims: Dispatch<SetStateAction<Record<string, string>>>;
    debtorLawyerFeesClaims: Record<string, string>;
    setDebtorLawyerFeesClaims: Dispatch<SetStateAction<Record<string, string>>>;
    globalClaimTotalForSplit: number;
    lawyerFeesAmount: string;
}

/**
 * إدارة أطراف الإضبارة (دائن/مدين): إضافة/حذف/تحديث، «موكلي» الحصري، وقسمة
 * الدين/الأتعاب اليدوية للمدينين المستقلين — مستخرج من ExecutionCreationView
 * لتقليص حجم المكوّن الرئيسي (Phase-2 split).
 */
export function useExecutionCreationPartyActions(params: UseExecutionCreationPartyActionsParams) {
    const {
        setCreditors,
        setAdditionalCreditors,
        debtors,
        setDebtors,
        additionalDebtorsForm,
        setAdditionalDebtorsForm,
        allowMultipleDebtors,
        debtorManualDebtClaims,
        setDebtorManualDebtClaims,
        debtorLawyerFeesClaims,
        setDebtorLawyerFeesClaims,
        globalClaimTotalForSplit,
        lawyerFeesAmount,
    } = params;

    // === PHASE 17 + تعدد الخصوم: دائن/مدين أساسي + مصفوفات امتداد ===
    const addCreditor = useCallback(() => {
        const id = `ac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setAdditionalCreditors((prev) => [
            ...prev,
            {
                id,
                name: '',
                phone: '',
                address: '',
                occupation: 'كاسب',
                isClient: false,
            },
        ]);
    }, [setAdditionalCreditors]);

    const removeAdditionalCreditor = useCallback(
        (id: string) => {
            setAdditionalCreditors((prev) => prev.filter((c) => c.id !== id));
        },
        [setAdditionalCreditors],
    );

    const coerceDebtorClientRow = useCallback(
        <T extends { id: number | string; occupation: string; isClient: boolean }>(
            row: T,
            makeClient: boolean
        ): T => {
            if (!makeClient) return { ...row, isClient: false };
            const loose = row as T & {
                entityKind?: string;
                entityType?: string;
                type?: string;
            };
            const kind = normalizeDebtorEntityKind(
                loose.entityKind ??
                    loose.entityType ??
                    (loose.type === 'company' ? 'legal_entity' : 'natural_person')
            );
            if (kind === 'legal_entity') {
                return {
                    ...row,
                    isClient: true,
                    entityKind: 'natural_person',
                    entityType: 'natural_person',
                    type: 'individual',
                    occupation: row.occupation === 'معنوي' ? 'كاسب' : row.occupation,
                } as T;
            }
            return { ...row, isClient: true };
        },
        []
    );

    const applyExclusiveClient = useCallback(
        (side: 'creditor' | 'debtor', partyId: number | string, isClient: boolean) => {
            if (!isClient) {
                if (side === 'creditor') {
                    if (typeof partyId === 'number') {
                        setCreditors((c0) =>
                            c0.map((c) => (c.id === partyId ? { ...c, isClient: false } : c))
                        );
                    } else {
                        setAdditionalCreditors((c0) =>
                            c0.map((c) => (c.id === partyId ? { ...c, isClient: false } : c))
                        );
                    }
                } else if (typeof partyId === 'number') {
                    setDebtors((d0) =>
                        d0.map((d) => (d.id === partyId ? { ...d, isClient: false } : d))
                    );
                } else {
                    setAdditionalDebtorsForm((d0) =>
                        d0.map((d) => (d.id === partyId ? { ...d, isClient: false } : d))
                    );
                }
                return;
            }

            setCreditors((c0) =>
                c0.map((c) => ({ ...c, isClient: side === 'creditor' && c.id === partyId }))
            );
            setAdditionalCreditors((c0) =>
                c0.map((c) => ({ ...c, isClient: side === 'creditor' && c.id === partyId }))
            );
            setDebtors((d0) =>
                d0.map((d) =>
                    side === 'debtor' && d.id === partyId
                        ? coerceDebtorClientRow(d, true)
                        : { ...d, isClient: false }
                )
            );
            setAdditionalDebtorsForm((d0) =>
                d0.map((d) =>
                    side === 'debtor' && d.id === partyId
                        ? coerceDebtorClientRow(d, true)
                        : { ...d, isClient: false }
                )
            );
        },
        [coerceDebtorClientRow, setCreditors, setAdditionalCreditors, setDebtors, setAdditionalDebtorsForm]
    );

    const updateAdditionalCreditor = useCallback(
        (id: string, field: string, value: string | boolean | number) => {
            if (field === 'isClient') {
                applyExclusiveClient('creditor', id, Boolean(value));
                return;
            }
            setAdditionalCreditors((prev) =>
                prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
            );
        },
        [applyExclusiveClient, setAdditionalCreditors]
    );

    const updateCreditor = useCallback(
        (id: number, field: string, value: string | boolean | number) => {
            if (field === 'isClient') {
                applyExclusiveClient('creditor', id, Boolean(value));
                return;
            }
            setCreditors((c0) => c0.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
        },
        [applyExclusiveClient, setCreditors],
    );

    const lockedDebtorEntityKind = useMemo(
        () => resolveLockedDebtorEntityKind(debtors, additionalDebtorsForm),
        [debtors, additionalDebtorsForm],
    );

    const appendAdditionalDebtor = useCallback(
        (isSolidaryLiability: boolean) => {
            if (!allowMultipleDebtors) return;
            const primaryKind = readPartyEntityKind(debtors[0] ?? {});
            const id = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            setAdditionalDebtorsForm((prev) => [
                ...prev,
                {
                    id,
                    name: '',
                    phone: '',
                    address: '',
                    occupation: primaryKind === 'legal_entity' ? ('معنوي' as const) : ('موظف' as const),
                    isClient: false,
                    isSolidaryLiability,
                    entityKind: primaryKind,
                    entityType: primaryKind,
                    type: primaryKind === 'legal_entity' ? 'company' : 'individual',
                },
            ]);
        },
        [allowMultipleDebtors, debtors, setAdditionalDebtorsForm],
    );

    const addIndependentDebtor = useCallback(() => appendAdditionalDebtor(false), [appendAdditionalDebtor]);
    const addSolidaryDebtor = useCallback(() => appendAdditionalDebtor(true), [appendAdditionalDebtor]);
    const addAnotherDebtor = useCallback(() => appendAdditionalDebtor(false), [appendAdditionalDebtor]);

    const removeAdditionalDebtor = useCallback(
        (id: string) => {
            setAdditionalDebtorsForm((prev) => prev.filter((d) => d.id !== id));
            setDebtorManualDebtClaims((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            setDebtorLawyerFeesClaims((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        },
        [setAdditionalDebtorsForm, setDebtorManualDebtClaims, setDebtorLawyerFeesClaims],
    );

    const guardDebtorEntityKindUpdate = useCallback(
        (partyId: number | string, nextRaw: string | boolean | number) => {
            const nextKind = normalizeDebtorEntityKind(String(nextRaw));
            if (
                !canSetDebtorEntityKind(
                    debtors,
                    additionalDebtorsForm as unknown as Array<{
                        id: string;
                        entityKind?: string;
                        entityType?: string;
                        type?: string;
                    }>,
                    partyId,
                    nextKind,
                )
            ) {
                SmartToast.error('⚠️ لا يمكن دمج مدين طبيعي مع مدين معنوي في نفس الإضبارة');
                return false;
            }
            return true;
        },
        [debtors, additionalDebtorsForm],
    );

    const updateAdditionalDebtor = useCallback(
        (id: string, field: string, value: string | boolean | number) => {
            if (field === 'isClient') {
                applyExclusiveClient('debtor', id, Boolean(value));
                return;
            }
            if (field === 'isSolidaryLiability') return;
            if (
                (field === 'entityKind' || field === 'entityType') &&
                !guardDebtorEntityKindUpdate(id, value)
            ) {
                return;
            }
            setAdditionalDebtorsForm((prev) =>
                prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
            );
        },
        [applyExclusiveClient, guardDebtorEntityKindUpdate, setAdditionalDebtorsForm]
    );

    const updateDebtor = useCallback(
        (id: number, field: string, value: string | boolean | number) => {
            if (field === 'isClient') {
                applyExclusiveClient('debtor', id, Boolean(value));
                return;
            }
            if (field === 'isSolidaryLiability') return;
            if (
                (field === 'entityKind' || field === 'entityType') &&
                !guardDebtorEntityKindUpdate(id, value)
            ) {
                return;
            }
            setDebtors((d0) => d0.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
        },
        [applyExclusiveClient, guardDebtorEntityKindUpdate, setDebtors],
    );

    const handleDebtorManualDebtChange = useCallback(
        (debtorKey: string, raw: string) => {
            const cleaned = stripMoneyGrouping(String(raw || ''));
            if (cleaned !== '' && !isPartialMoneyInput(cleaned)) return;

            const debtorSolidaryFlags = [
                Boolean(debtors[0]?.isSolidaryLiability),
                ...additionalDebtorsForm.map((d) => Boolean(d.isSolidaryLiability)),
            ];
            const manualBySlot = [
                parseMoneyInput(debtorManualDebtClaims[String(debtors[0]?.id ?? '')] ?? ''),
                ...additionalDebtorsForm.map((d) =>
                    parseMoneyInput(debtorManualDebtClaims[String(d.id)] ?? ''),
                ),
            ];
            const slotIndex =
                String(debtors[0]?.id ?? '') === debtorKey
                    ? 0
                    : additionalDebtorsForm.findIndex((d) => String(d.id) === debtorKey) + 1;
            if (slotIndex < 0 || debtorSolidaryFlags[slotIndex]) return;

            const capped = capManualIndependentDebtRaw(
                globalClaimTotalForSplit,
                debtorSolidaryFlags,
                manualBySlot,
                slotIndex,
                cleaned,
            );
            setDebtorManualDebtClaims((prev) => ({ ...prev, [debtorKey]: capped }));
        },
        [
            debtors,
            additionalDebtorsForm,
            debtorManualDebtClaims,
            globalClaimTotalForSplit,
            setDebtorManualDebtClaims,
        ],
    );

    const handleDebtorLawyerFeesChange = useCallback(
        (debtorKey: string, raw: string) => {
            const cleaned = stripMoneyGrouping(String(raw || ''));
            if (cleaned !== '' && !isPartialMoneyInput(cleaned)) return;

            const debtorSolidaryFlags = [
                Boolean(debtors[0]?.isSolidaryLiability),
                ...additionalDebtorsForm.map((d) => Boolean(d.isSolidaryLiability)),
            ];
            const manualBySlot = [
                parseMoneyInput(debtorLawyerFeesClaims[String(debtors[0]?.id ?? '')] ?? ''),
                ...additionalDebtorsForm.map((d) =>
                    parseMoneyInput(debtorLawyerFeesClaims[String(d.id)] ?? ''),
                ),
            ];
            const slotIndex =
                String(debtors[0]?.id ?? '') === debtorKey
                    ? 0
                    : additionalDebtorsForm.findIndex((d) => String(d.id) === debtorKey) + 1;
            if (slotIndex < 0 || debtorSolidaryFlags[slotIndex]) return;

            const capped = capManualIndependentLawyerFeesRaw(
                parseMoneyInput(lawyerFeesAmount),
                debtorSolidaryFlags,
                manualBySlot,
                slotIndex,
                cleaned,
            );
            setDebtorLawyerFeesClaims((prev) => ({ ...prev, [debtorKey]: capped }));
        },
        [
            debtors,
            additionalDebtorsForm,
            debtorLawyerFeesClaims,
            lawyerFeesAmount,
            setDebtorLawyerFeesClaims,
        ],
    );

    return {
        addCreditor,
        removeAdditionalCreditor,
        updateAdditionalCreditor,
        updateCreditor,
        lockedDebtorEntityKind,
        addIndependentDebtor,
        addSolidaryDebtor,
        addAnotherDebtor,
        removeAdditionalDebtor,
        updateAdditionalDebtor,
        updateDebtor,
        handleDebtorManualDebtChange,
        handleDebtorLawyerFeesChange,
    };
}
