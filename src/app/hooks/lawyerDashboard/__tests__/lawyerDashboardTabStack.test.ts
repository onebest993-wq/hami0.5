import { describe, expect, it } from 'vitest';
import { shouldMaskLawyerDashboardTabStack, isLawyerDashboardTabMounted } from '@/app/hooks/lawyerDashboard/lawyerDashboardTabStack';

const base = {
    isCriminalDossierOpen: false,
    archiveType: null,
    showLawsuitsWorkspace: false,
    lawsuitsWorkspaceTab: 'civil' as const,
    showTransactions: false,
    isNotepadOpen: false,
    showSettings: false,
    showCommunity: false,
    activeFile: null,
    showDocs: false,
} as const;

describe('shouldMaskLawyerDashboardTabStack', () => {
    it('does not mask home on idle dashboard (no fullscreen overlay)', () => {
        expect(shouldMaskLawyerDashboardTabStack(base)).toBe(false);
    });

    it('masks when execution archive is open', () => {
        expect(
            shouldMaskLawyerDashboardTabStack({
                ...base,
                archiveType: 'execution',
            }),
        ).toBe(true);
    });

    it('does not mask home when field tasks sheet is open (bottom sheet overlay)', () => {
        expect(
            shouldMaskLawyerDashboardTabStack({
                ...base,
                fieldTasksSheetOpen: true,
            } as never),
        ).toBe(false);
    });

    it('does not mask home when tasks manager is open (full-screen overlay portal)', () => {
        expect(
            shouldMaskLawyerDashboardTabStack({
                ...base,
                showTasksManager: true,
            } as never),
        ).toBe(false);
    });

    it('does not mask home when a lawsuit dossier overlay is open (keep painted)', () => {
        expect(
            shouldMaskLawyerDashboardTabStack({
                ...base,
                activeFile: { id: 'ls-1', type: 'lawsuit' } as never,
            }),
        ).toBe(false);
    });

    it('does not mask home when lawsuits workspace is open (overlay above painted home)', () => {
        expect(
            shouldMaskLawyerDashboardTabStack({
                ...base,
                showLawsuitsWorkspace: true,
            }),
        ).toBe(false);
    });

    it('masks when transactions hub is open', () => {
        expect(
            shouldMaskLawyerDashboardTabStack({
                ...base,
                showTransactions: true,
            }),
        ).toBe(true);
    });
});

describe('isLawyerDashboardTabMounted', () => {
    it('يفكّ التركيب عند فتح المنتدى رغم بقاء activeTab على home', () => {
        expect(
            isLawyerDashboardTabMounted(true, {
                ...base,
                showCommunity: true,
            }),
        ).toBe(false);
    });

    it('يبقي التركيب على الرئيسية بدون overlay كامل', () => {
        expect(isLawyerDashboardTabMounted(true, base)).toBe(true);
    });
});
