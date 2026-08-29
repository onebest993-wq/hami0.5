import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lawyerNetworkRepository', async () => {
    const { listNetworkColleaguesForShareTests } = await import('./caseShareTestFixtures');
    return { listNetworkColleagues: listNetworkColleaguesForShareTests };
});

import { CaseShareRepository, CASE_SHARE_DOSSIER_DELETED_ENDED_BY } from '../caseShareRepository';
import { canFetchShareDetail } from '../caseShareAccessControl';
import { extractCriminalShareSource } from '../caseShareExtractors';
import {
    CRIMINAL_CASE_SHARE_MODULES,
    EXECUTION_CASE_SHARE_MODULES,
    revokeCaseSharesForDeletedDossier,
} from '../caseShareDossierRevocation';
import {
    PERSONAS,
    buildRichExecutionFile,
    fieldsWith,
    resetCaseShareStore,
    richExecutionSource,
    seedOwnedExecutionForShareTests,
} from './caseShareTestFixtures';
import { extractExecutionShareSource } from '../caseShareExtractors';
import { saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import {
    resetCriminalStore,
    seedDraftForNewCase,
    TEST_CRIMINAL_SESSION_LAWYER_ID,
} from '@/app/components/lawyer/criminal-system/__tests__/criminalStoreTestHelpers';
import { useCriminalStore } from '@/app/components/lawyer/criminal-system/criminalStore';

describe('caseShareDossierRevocation — تنفيذ', () => {
    beforeEach(() => {
        resetCaseShareStore();
        seedOwnedExecutionForShareTests();
    });

    it('revokeCaseSharesForDeletedDossier ينهي جلسات التنفيذ النشطة والمعلّقة', async () => {
        const source = richExecutionSource();
        const pending = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fieldsWith({}),
        });
        const active = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fieldsWith({ documents: false }),
        });
        await CaseShareRepository.updateStatus(active.id, PERSONAS.recipient.id, 'accepted');

        const revoked = await revokeCaseSharesForDeletedDossier(
            PERSONAS.sender.id,
            source.dossierId,
            EXECUTION_CASE_SHARE_MODULES,
        );
        expect(revoked).toBe(2);

        expect(await CaseShareRepository.getById(pending.id, PERSONAS.recipient.id)).toBeNull();
        expect(await CaseShareRepository.getById(active.id, PERSONAS.recipient.id)).toBeNull();

        const ownerView = await CaseShareRepository.getById(pending.id, PERSONAS.sender.id);
        expect(ownerView?.status).toBe('ended');
        expect(ownerView?.endedByUserId).toBe(CASE_SHARE_DOSSIER_DELETED_ENDED_BY);
        expect(canFetchShareDetail(ownerView!, PERSONAS.recipient.id)).toBe(false);
    });

    it('revokeCaseSharesForDeletedDossier يقتصر على المعرّف المستهدف', async () => {
        const primary = richExecutionSource();
        const secondaryFile = { ...buildRichExecutionFile(), id: 'exec-9002' };
        saveExecutionFilesRaw([buildRichExecutionFile(), secondaryFile]);
        const secondary = extractExecutionShareSource(secondaryFile);

        const primaryShare = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: primary,
            visibleFields: fieldsWith({}),
        });
        const secondaryShare = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: secondary,
            visibleFields: fieldsWith({}),
        });

        const revoked = await revokeCaseSharesForDeletedDossier(
            PERSONAS.sender.id,
            primary.dossierId,
            EXECUTION_CASE_SHARE_MODULES,
        );
        expect(revoked).toBe(1);

        const primaryAfter = await CaseShareRepository.getById(primaryShare.id, PERSONAS.sender.id);
        const secondaryAfter = await CaseShareRepository.getById(secondaryShare.id, PERSONAS.sender.id);
        expect(primaryAfter?.status).toBe('ended');
        expect(secondaryAfter?.status).toBe('pending');
    });

    it('revokeCaseSharesForDeletedDossier يتجاهل المالك أو المعرّف الفارغ', async () => {
        expect(await revokeCaseSharesForDeletedDossier('', 'exec-9001', EXECUTION_CASE_SHARE_MODULES)).toBe(0);
        expect(await revokeCaseSharesForDeletedDossier(PERSONAS.sender.id, '', EXECUTION_CASE_SHARE_MODULES)).toBe(0);
    });
});

describe('caseShareDossierRevocation — جنائي', () => {
    let criminalCaseId = '';

    beforeEach(() => {
        resetCaseShareStore();
        resetCriminalStore();
        seedDraftForNewCase('مرحلة التحقيق');
        criminalCaseId = useCriminalStore.getState().createCaseFromDraft() ?? '';
        expect(criminalCaseId).toBeTruthy();
    });

    it('revokeCaseSharesForDeletedDossier ينهي جلسات الجزائي', async () => {
        const caseRecord = useCriminalStore.getState().casesById[criminalCaseId];
        expect(caseRecord).toBeTruthy();
        const source = extractCriminalShareSource(caseRecord!);

        const share = await CaseShareRepository.createShare({
            ownerId: TEST_CRIMINAL_SESSION_LAWYER_ID,
            ownerName: 'محامٍ اختبار',
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fieldsWith({}),
        });
        await CaseShareRepository.updateStatus(share.id, PERSONAS.recipient.id, 'accepted');

        const revoked = await revokeCaseSharesForDeletedDossier(
            TEST_CRIMINAL_SESSION_LAWYER_ID,
            criminalCaseId,
            CRIMINAL_CASE_SHARE_MODULES,
        );
        expect(revoked).toBe(1);
        expect(await CaseShareRepository.getById(share.id, PERSONAS.recipient.id)).toBeNull();

        const ownerView = await CaseShareRepository.getById(share.id, TEST_CRIMINAL_SESSION_LAWYER_ID);
        expect(ownerView?.status).toBe('ended');
        expect(ownerView?.endedByUserId).toBe(CASE_SHARE_DOSSIER_DELETED_ENDED_BY);
        expect(canFetchShareDetail(ownerView!, PERSONAS.recipient.id)).toBe(false);
    });

    it('deleteCase ينهي جلسات المشاركة المرتبطة', async () => {
        const caseRecord = useCriminalStore.getState().casesById[criminalCaseId];
        const source = extractCriminalShareSource(caseRecord!);
        const share = await CaseShareRepository.createShare({
            ownerId: TEST_CRIMINAL_SESSION_LAWYER_ID,
            ownerName: 'محامٍ اختبار',
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fieldsWith({}),
        });

        useCriminalStore.getState().deleteCase(criminalCaseId);

        const after = await CaseShareRepository.getById(share.id, PERSONAS.recipient.id);
        expect(after).toBeNull();
        expect(useCriminalStore.getState().casesById[criminalCaseId]).toBeUndefined();

        const ownerView = await CaseShareRepository.getById(share.id, TEST_CRIMINAL_SESSION_LAWYER_ID);
        expect(ownerView?.status).toBe('ended');
    });
});
