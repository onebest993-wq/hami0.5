import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('lawsuit vault — no recover CTA, intentional lifecycle only', () => {
    it('LawsuitArchiveFileGrid has no recover button', () => {
        const src = fs.readFileSync(
            path.join(
                process.cwd(),
                'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx',
            ),
            'utf8',
        );
        expect(src).not.toContain('lawsuit-archive-recover');
        expect(src).not.toContain('استعادة الدعاوى من التخزين المحلي');
        expect(src).not.toContain('handleRecoverLawsuitWorkspace');
    });

    it('setFiles path never shrinks active without merge', () => {
        const src = [
            fs.readFileSync(
                path.join(process.cwd(), 'src/app/hooks/useLawsuitFilesState.ts'),
                'utf8',
            ),
            fs.readFileSync(
                path.join(process.cwd(), 'src/app/hooks/lawsuitFilesHydrateCycle.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(src).toContain('setFiles لا يُقلّص القائمة أبداً');
        expect(src).toContain('mergeLawsuitDurabilityOverlaysInto');
        expect(src).toContain('lawsuitDurabilityHasUncommittedWrites');
        expect(src).toContain('pickRicherSegments(prev, candidate)');
        expect(src).toContain('applyLawsuitDurabilityOverlaysToSegments');
    });

    it('writeJsonArray and wipe guard refuse colder/poorer lawsuit overwrites', () => {
        const wipe = fs.readFileSync(
            path.join(
                process.cwd(),
                'src/app/services/dossierPersistence/dossierWipeGuard.ts',
            ),
            'utf8',
        );
        const persist = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitSegmentPersist.ts'),
            'utf8',
        );
        const segment = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitSegmentStorage.ts'),
            'utf8',
        );
        expect(wipe).toContain("storageKey.includes('lawyer_files')");
        expect(wipe).toContain('incomingCount < existingCount');
        expect(persist).toContain('function writeJsonArray');
        expect(persist).toContain('isPoorerLawsuitActiveList');
        expect(segment).toContain('allowShrink');
        expect(segment).toContain('isUnreadSync');
        expect(segment).toContain('unionLawsuitPayloadWithDiskSegments');
        expect(segment).toContain('collectLawsuitLocalRowsForSync');
    });

    it('golden pending rule — لا مسح معلّق إلا بعد إثبات قرص', () => {
        const verify = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitDurabilityVerify.ts'),
            'utf8',
        );
        const pending = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitPendingCreateStore.ts'),
            'utf8',
        );
        expect(verify).toContain('tryClearPendingLawsuitCreateAfterProof');
        expect(verify).toContain('settleLawsuitPendingPersist');
        expect(verify).toContain('verifyLawsuitActiveFileOnDisk');
        expect(verify).toContain('wasLawsuitStagedThisPage');
        expect(pending).toContain('tryClearPendingLawsuitCreateAfterProof');
    });

    it('unified write gate — active ثم index ثم mirror + WAL journal', () => {
        const gate = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitDurabilityGate.ts'),
            'utf8',
        );
        expect(gate).toContain('persistLawsuitActiveBundle');
        expect(gate).toContain('stageLawsuitJournalRecords');
        expect(gate).toContain('mergeRicherLawsuitActive');
    });

    it('journal prune — فقط بعد إثبات قرص async وليس داخل البوابة', () => {
        const gate = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitDurabilityGate.ts'),
            'utf8',
        );
        const verify = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitDurabilityVerify.ts'),
            'utf8',
        );
        expect(gate).not.toContain('pruneVerifiedLawsuitJournalEntries');
        expect(verify).toContain('tryFinalizeLawsuitJournalAfterProof');
        expect(verify).toContain('pruneVerifiedLawsuitJournalEntries');
    });

    it('write journal — append-only حتى إثبات القرص', () => {
        const journal = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitWriteJournal.ts'),
            'utf8',
        );
        const verify = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitDurabilityVerify.ts'),
            'utf8',
        );
        expect(journal).toContain('LAWSUIT_WRITE_JOURNAL_KEY');
        expect(journal).toContain('stageLawsuitJournalRecords');
        expect(verify).toContain('tryFinalizeLawsuitJournalAfterProof');
        expect(verify).toContain('pruneVerifiedLawsuitJournalEntries');
    });

    it('lifecycle mutations route active writes through the gate', () => {
        const mut = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitFilesSegmentMutations.ts'),
            'utf8',
        );
        expect(mut).not.toContain('persistLawsuitActiveSegment(');
        expect(mut).toContain('persistLawsuitActiveBundle');
        expect(mut).toContain('pruneLawsuitDurabilityOverlaysForFileIds');
    });

    it('durability overlay — دمج pending + journal + تنظيف دورة الحياة', () => {
        const overlay = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitDurabilityOverlay.ts'),
            'utf8',
        );
        expect(overlay).toContain('mergeLawsuitDurabilityOverlaysInto');
        expect(overlay).toContain('flushLawsuitDurabilityOverlaysToActive');
        expect(overlay).toContain('pruneLawsuitDurabilityOverlaysForFileIds');
        expect(overlay).toContain('finalizeLawsuitDurabilityAfterCommit');
    });

    it('migration segment bundle routes active writes through unified gate', () => {
        const segment = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitSegmentStorage.ts'),
            'utf8',
        );
        expect(segment).toContain('persistLawsuitActiveBundle');
        expect(segment).not.toContain('stageLawsuitJournalRecords');
        expect(segment).not.toContain('syncLawsuitMonolithicMirror(active, archived, trash)');
    });

    it('autosave and edits schedule durability finalize', () => {
        const hooks = fs.readFileSync(
            path.join(process.cwd(), 'src/app/hooks/useLawsuitFilesState.ts'),
            'utf8',
        );
        const overlay = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitDurabilityOverlay.ts'),
            'utf8',
        );
        expect(overlay).toContain('scheduleFinalizeLawsuitDurabilityAfterCommit');
        expect(hooks).toContain('scheduleFinalizeLawsuitDurabilityAfterCommit');
    });
});
