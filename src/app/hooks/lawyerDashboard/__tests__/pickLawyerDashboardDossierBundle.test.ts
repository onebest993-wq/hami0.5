import { describe, expect, it } from 'vitest';
import type { LawyerDashboardDossierBundle } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import { pickLawyerDashboardDossierBundle } from '@/app/hooks/lawyerDashboard/pickLawyerDashboardWorkspaceOverlayBundles';

const DOSSIER_BUNDLE_KEYS: Array<keyof LawyerDashboardDossierBundle> = [
    'activeFile',
    'setActiveFile',
    'handleUpdateFile',
    'handleUpdateExecutionFile',
    'handleDeleteFile',
    'initiateSubFile',
    'handleSpawnLinkedIncidentalCase',
    'handleOpenLinkedFile',
    'handleStartConsolidationNewCase',
    'handleConsolidateWithExisting',
    'handleLinkWithExistingCase',
    'consolidationNavActive',
    'caseLinkNav',
    'consolidationSpawnNav',
    'caseLinkViewOnly',
    'returnFromCaseLinkBrowse',
    'clearCaseLinkBrowse',
    'handleUnlinkCaseLink',
    'caseLinkBrowse',
];

describe('pickLawyerDashboardDossierBundle', () => {
    it('يمرّر كل حقول LawyerDashboardDossierBundle بما فيها case-link', () => {
        const workspace = {
            activeFile: null,
            setActiveFile: () => undefined,
            handleUpdateFile: async () => undefined,
            handleUpdateExecutionFile: async () => undefined,
            handleDeleteFile: async () => undefined,
            initiateSubFile: () => undefined,
            handleSpawnLinkedIncidentalCase: () => undefined,
            handleOpenLinkedFile: () => undefined,
            handleStartConsolidationNewCase: () => undefined,
            handleConsolidateWithExisting: () => undefined,
            handleLinkWithExistingCase: () => undefined,
            consolidationNavActive: false,
            caseLinkNav: null,
            consolidationSpawnNav: null,
            caseLinkBrowse: null,
            caseLinkViewOnly: false,
            returnFromCaseLinkBrowse: () => undefined,
            clearCaseLinkBrowse: () => undefined,
            handleUnlinkCaseLink: async () => undefined,
        };

        const bundle = pickLawyerDashboardDossierBundle(workspace as never);

        for (const key of DOSSIER_BUNDLE_KEYS) {
            expect(bundle, `missing dossier bundle field: ${key}`).toHaveProperty(key);
        }
        expect(bundle.clearCaseLinkBrowse).toBeTypeOf('function');
        expect(bundle.returnFromCaseLinkBrowse).toBeTypeOf('function');
    });
});
