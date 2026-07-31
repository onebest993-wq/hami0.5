import { describe, expect, it, vi } from 'vitest';
import {
    applyPhoneBodyDossierLifecycleFallback,
    bridgeOpenEditDossierMeta,
    bridgeOpenEditParty,
    bridgeOpenParentDossierMetaEdit,
    buildFallbackDossierMetaDraftFromScope,
    openPhoneBodyModalWithBridge,
} from '../executionDashboardPhoneBodyBridges';

describe('executionDashboardPhoneBodyBridges', () => {
    it('builds fallback dossier meta draft from execution data and scope fields', () => {
        expect(
            buildFallbackDossierMetaDraftFromScope({
                executionData: {
                    directorate: 'تنفيذ الكرخ',
                    fileNumber: '12',
                    fileYear: '2026',
                    docNumber: '55',
                    judgmentDate: '2026-01-02T10:00:00.000Z',
                    classification: 'مدني',
                    eviction_premises_use: 'commercial',
                },
                evictionPropertyDistrict: 'المنصور',
            }),
        ).toEqual(
            expect.objectContaining({
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
                docNumber: '55',
                judgmentDate: '2026-01-02',
                classification: 'مدني',
                district: 'المنصور',
                eviction_premises_use: 'commercial',
            }),
        );
    });

    it('applies dossier lifecycle through explicit apply when available', () => {
        const apply = vi.fn(() => true);
        const pick = vi.fn();
        const confirm = vi.fn();

        expect(
            applyPhoneBodyDossierLifecycleFallback({
                status: 'paused',
                reason: 'سبب',
                date: '2026-07-11',
                apply,
                pick,
                confirm,
            }),
        ).toBe(true);
        expect(apply).toHaveBeenCalledWith('paused', 'سبب', '2026-07-11');
        expect(pick).not.toHaveBeenCalled();
        expect(confirm).not.toHaveBeenCalled();
    });

    it('falls back to pick and confirm when no lifecycle apply exists', () => {
        const pick = vi.fn();
        const confirm = vi.fn();

        expect(
            applyPhoneBodyDossierLifecycleFallback({
                status: 'finished',
                reason: 'اكتمل',
                date: '2026-07-11',
                apply: null,
                pick,
                confirm,
            }),
        ).toBe(true);
        expect(pick).toHaveBeenCalledWith('finished');
        expect(confirm).toHaveBeenCalledWith('اكتمل', '2026-07-11');
    });

    it('bridges dossier meta opening by seeding draft and modal state when handler stays stale', () => {
        const openEditDossierMeta = vi.fn();
        const setDossierMetaDraft = vi.fn();
        const setShowEditDossierMetaModal = vi.fn();
        const scope = {
            openEditDossierMeta,
            showEditDossierMetaModal: false,
            dossierMetaDraft: null,
            setDossierMetaDraft,
            setShowEditDossierMetaModal,
            executionData: {
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
            },
        };

        const tasks: Array<() => void> = [];
        expect(
            bridgeOpenEditDossierMeta({
                readLatestScope: () => scope,
                scheduleBridge: (task) => tasks.push(task),
                buildFallbackDraft: buildFallbackDossierMetaDraftFromScope,
            }),
        ).toBe(true);

        tasks.forEach((task) => task());

        expect(openEditDossierMeta).toHaveBeenCalledTimes(1);
        expect(setDossierMetaDraft).toHaveBeenCalledWith(
            expect.objectContaining({
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
            }),
        );
        expect(setShowEditDossierMetaModal).toHaveBeenCalledWith(true);
    });

    it('bridges party editing by seeding fallback target from party id', () => {
        const openEditParty = vi.fn();
        const setEditPartyTarget = vi.fn();
        const scope = {
            openEditParty,
            editPartyTarget: null,
            setEditPartyTarget,
        };

        const tasks: Array<() => void> = [];
        expect(
            bridgeOpenEditParty({
                kind: 'creditor',
                index: 0,
                opts: { party: { id: 'cred-1' } },
                readLatestScope: () => scope,
                scheduleBridge: (task) => tasks.push(task),
            }),
        ).toBe(true);

        tasks.forEach((task) => task());

        expect(openEditParty).toHaveBeenCalledWith('creditor', 0, { party: { id: 'cred-1' } });
        expect(setEditPartyTarget).toHaveBeenCalledWith({
            kind: 'creditor',
            index: 0,
            forceHeirs: false,
            partyId: 'cred-1',
        });
    });

    it('bridges parent dossier editing by flipping the modal when the shell stays stale', () => {
        const openParentDossierMetaEdit = vi.fn();
        const setShowEditDossierMetaModal = vi.fn();
        const scope = {
            openParentDossierMetaEdit,
            showEditDossierMetaModal: false,
            setShowEditDossierMetaModal,
        };

        const tasks: Array<() => void> = [];
        expect(
            bridgeOpenParentDossierMetaEdit({
                readLatestScope: () => scope,
                scheduleBridge: (task) => tasks.push(task),
            }),
        ).toBe(true);

        tasks.forEach((task) => task());

        expect(openParentDossierMetaEdit).toHaveBeenCalledTimes(1);
        expect(setShowEditDossierMetaModal).toHaveBeenCalledWith(true);
    });

    it('opens modal through fallback setter and schedules a second bridge pass when needed', () => {
        const fallbackSetter = vi.fn();
        const directSetter = vi.fn();
        const scope = {
            showNotesModal: false,
            setShowNotesModal: null,
        };
        const tasks: Array<() => void> = [];

        openPhoneBodyModalWithBridge({
            readLatestScope: () => scope,
            scheduleBridge: (task) => tasks.push(task),
            commitBridge: (task) => task(),
            modalFlagKey: 'showNotesModal',
            modalSetterKey: 'setShowNotesModal',
            fallbackSetter,
            directSetter,
        });

        expect(fallbackSetter).toHaveBeenCalledWith(true);
        expect(directSetter).toHaveBeenCalledWith(true);

        tasks.forEach((task) => task());

        expect(directSetter).toHaveBeenCalledTimes(2);
    });
});
