/** Stable selectors for E2E / integration (no visual impact). */
export const CRIMINAL_DOSSIER_TEST_IDS = {
    dossier: 'criminal-dashboard-dossier',
    back: 'criminal-dashboard-back',
    archiveTabCriminal: 'archive-tab-criminal',
    caseCard: (id: string) => `criminal-case-${id}`,
} as const;
