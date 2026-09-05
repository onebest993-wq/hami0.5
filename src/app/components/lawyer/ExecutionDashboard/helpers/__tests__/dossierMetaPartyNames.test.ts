import { describe, expect, it } from 'vitest';
import {
    buildDossierPartyNamesPatch,
    encodeDossierPartyNames,
    listDossierPartyNameFields,
    mergeIncomingDossierMetaDraft,
    validateDossierPartyNames,
} from '../dossierMetaPartyNames';
import type { ExecutionFile } from '@/app/types/execution';

const file = {
    id: 'ex-1',
    creditors: [{ id: 'c-1', type: 'creditor', name: 'دائن قديم', phone: '', address: '' }],
    debtors: [{ id: 'd-1', type: 'debtor', name: 'مدين قديم', phone: '', address: '', notificationDate: null }],
    clientName: 'دائن قديم',
    opponentName: 'مدين قديم',
} as unknown as ExecutionFile;

describe('dossier meta party names', () => {
    it('encodes creditor and debtor names into the dossier draft', () => {
        const draft = encodeDossierPartyNames({ directorate: 'الكرخ' }, file);
        expect(draft.partyCreditorCount).toBe('1');
        expect(draft['creditorName:0']).toBe('دائن قديم');
        expect(draft['debtorName:0']).toBe('مدين قديم');
        expect(listDossierPartyNameFields(draft).map((f) => f.label)).toEqual([
            'اسم الدائن',
            'اسم المدين',
        ]);
    });

    it('fills empty live-draft keys from a later parent snapshot without clobbering typing', () => {
        const typed = { directorate: 'الكرخ', 'creditorName:0': 'علي' };
        const incoming = {
            directorate: 'الكرخ',
            'creditorName:0': 'دائن قديم',
            'debtorName:0': 'حسن',
            fileNumber: '12',
        };
        expect(mergeIncomingDossierMetaDraft(typed, incoming)).toEqual({
            directorate: 'الكرخ',
            'creditorName:0': 'علي',
            'debtorName:0': 'حسن',
            fileNumber: '12',
        });
    });

    it('fills primary names from clientName when creditor rows are blank', () => {
        const blankRows = {
            id: 'ex-blank-rows',
            creditors: [{ id: 'c-1', type: 'creditor', name: '', phone: '', address: '' }],
            debtors: [
                { id: 'd-1', type: 'debtor', name: '', phone: '', address: '', notificationDate: null },
            ],
            clientName: 'موكل ظاهر',
            opponentName: 'خصم ظاهر',
        } as unknown as ExecutionFile;
        const draft = encodeDossierPartyNames({}, blankRows);
        expect(draft['creditorName:0']).toBe('موكل ظاهر');
        expect(draft['debtorName:0']).toBe('خصم ظاهر');
    });

    it('always exposes creditor and debtor name fields even when lists are empty', () => {
        const emptyFile = {
            id: 'ex-empty',
            clientName: 'موكل من الحقل القديم',
            opponentName: 'خصم من الحقل القديم',
        } as unknown as ExecutionFile;
        const draft = encodeDossierPartyNames({}, emptyFile);
        expect(draft.partyCreditorCount).toBe('1');
        expect(draft.partyDebtorCount).toBe('1');
        expect(draft['creditorName:0']).toBe('موكل من الحقل القديم');
        expect(draft['debtorName:0']).toBe('خصم من الحقل القديم');
        expect(listDossierPartyNameFields({}).map((f) => f.key)).toEqual([
            'creditorName:0',
            'debtorName:0',
        ]);
    });

    it('allows empty party names, rejects overlong names, and patches renamed parties', () => {
        const draft = encodeDossierPartyNames({}, file);
        expect(validateDossierPartyNames({ ...draft, 'creditorName:0': '' }).ok).toBe(true);
        expect(
            validateDossierPartyNames({ ...draft, 'creditorName:0': 'س'.repeat(121) }).ok,
        ).toBe(false);
        expect(validateDossierPartyNames({ ...draft, 'creditorName:0': 'دائن جديد' }).ok).toBe(
            true,
        );
        const patch = buildDossierPartyNamesPatch(file, {
            ...draft,
            'creditorName:0': 'دائن جديد',
            'debtorName:0': 'مدين جديد',
        });
        expect((patch.creditors as Array<{ name: string }>)[0]?.name).toBe('دائن جديد');
        expect((patch.debtors as Array<{ name: string }>)[0]?.name).toBe('مدين جديد');
        expect(patch.clientName).toBe('دائن جديد');
        expect(patch.opponentName).toBe('مدين جديد');
    });

    it('creates primary parties when the file lists are empty and names are filled', () => {
        const emptyFile = { id: 'ex-seed' } as unknown as ExecutionFile;
        const patch = buildDossierPartyNamesPatch(emptyFile, {
            partyCreditorCount: '1',
            partyDebtorCount: '1',
            'creditorName:0': 'دائن جديد',
            'debtorName:0': 'مدين جديد',
        });
        expect((patch.creditors as Array<{ name: string }>)[0]?.name).toBe('دائن جديد');
        expect((patch.debtors as Array<{ name: string }>)[0]?.name).toBe('مدين جديد');
        expect(patch.clientName).toBe('دائن جديد');
        expect(patch.opponentName).toBe('مدين جديد');
        expect(patch.parties).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'دائن جديد', role: 'الدائن' }),
                expect.objectContaining({ name: 'مدين جديد', role: 'المدين' }),
            ]),
        );
        expect(buildDossierPartyNamesPatch(emptyFile, {})).toEqual({});
    });

    it('rewrites parties/clientName so coerce cannot restore the old creditor name', () => {
        const withParties = {
            id: 'ex-parties',
            creditors: [{ id: 'c-1', type: 'creditor', name: 'قديم', phone: '', address: '' }],
            debtors: [
                { id: 'd-1', type: 'debtor', name: 'مدين', phone: '', address: '', notificationDate: null },
            ],
            parties: [
                { id: 'c-1', name: 'قديم', role: 'الدائن' },
                { id: 'd-1', name: 'مدين', role: 'المدين' },
            ],
        } as unknown as ExecutionFile;
        const draft = encodeDossierPartyNames({}, withParties);
        const patch = buildDossierPartyNamesPatch(withParties, {
            ...draft,
            'creditorName:0': 'فقغغقفغقف',
        });
        expect((patch.creditors as Array<{ name: string }>)[0]?.name).toBe('فقغغقفغقف');
        expect(patch.clientName).toBe('فقغغقفغقف');
        expect(
            (patch.parties as Array<{ name: string; role?: string }>).find((p) => p.role === 'الدائن')
                ?.name,
        ).toBe('فقغغقفغقف');
    });

    it('omits deceased parties from editable name fields and does not rename them on patch', () => {
        const deadFile = {
            id: 'ex-dead',
            creditors: [
                {
                    id: 'c-1',
                    type: 'creditor',
                    name: 'دائن متوفى',
                    phone: '',
                    address: '',
                    isDeceased: true,
                },
            ],
            debtors: [
                {
                    id: 'd-1',
                    type: 'debtor',
                    name: 'مدين قديم',
                    phone: '',
                    address: '',
                    notificationDate: null,
                },
            ],
            clientName: 'دائن متوفى',
            opponentName: 'مدين قديم',
            is_creditor_deceased: true,
        } as unknown as ExecutionFile;
        const draft = encodeDossierPartyNames({}, deadFile);
        expect(draft['creditorDeceased:0']).toBe('1');
        expect(draft['debtorDeceased:0']).toBe('0');
        expect(listDossierPartyNameFields(draft).map((f) => f.kind)).toEqual(['debtor']);
        const patch = buildDossierPartyNamesPatch(deadFile, {
            ...draft,
            'creditorName:0': 'محاولة تغيير اسم المتوفى',
            'debtorName:0': 'مدين جديد',
        });
        expect((patch.creditors as Array<{ name: string }>)[0]?.name).toBe('دائن متوفى');
        expect((patch.debtors as Array<{ name: string }>)[0]?.name).toBe('مدين جديد');
        expect(patch.clientName).toBe('دائن متوفى');
        expect(patch.opponentName).toBe('مدين جديد');
    });

    it('hides every name field when both sides are deceased', () => {
        const bothDead = {
            id: 'ex-both-dead',
            creditors: [{ id: 'c-1', type: 'creditor', name: 'دائن', isDeceased: true }],
            debtors: [
                {
                    id: 'd-1',
                    type: 'debtor',
                    name: 'مدين',
                    isDeceased: true,
                    notificationDate: null,
                },
            ],
            is_creditor_deceased: true,
            is_debtor_deceased: true,
        } as unknown as ExecutionFile;
        const draft = encodeDossierPartyNames({}, bothDead);
        expect(listDossierPartyNameFields(draft)).toEqual([]);
        expect(validateDossierPartyNames(draft).ok).toBe(true);
    });
});
