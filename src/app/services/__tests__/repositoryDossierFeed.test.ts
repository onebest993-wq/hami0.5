import { describe, expect, it } from 'vitest';
import { collectDossierNotes } from '@/app/services/repository/repositoryDossierNotes';
import { buildRepositoryFeedCacheKey } from '@/app/services/repository/repositoryFeedWarmCache';

describe('repository dossier feed', () => {
    it('does not collect deleted lawsuit timeline notes', () => {
        const notes = collectDossierNotes(
            [
                {
                    id: 11,
                    title: 'دعوى تجريبية',
                    type: 'lawsuit',
                    stages: [
                        {
                            id: 'stage-1',
                            name: 'stage',
                            timeline: [
                                {
                                    id: 'corr_1',
                                    type: 'note',
                                    title: 'مخاطبة',
                                    details: 'يجب ألا تظهر',
                                    date: '2026-07-04T12:00:00.000Z',
                                    isDeleted: true,
                                },
                                {
                                    id: 'note_1',
                                    type: 'note',
                                    title: 'ملاحظة',
                                    details: 'هذه فقط يجب أن تبقى',
                                    date: '2026-07-04T13:00:00.000Z',
                                },
                            ],
                        },
                    ],
                } as never,
            ],
            [],
        );

        expect(notes.map((n) => n.id)).toEqual(['lawsuit:11:note_1']);
    });

    it('changes cache key when lawsuit timeline note becomes deleted', () => {
        const baseInput = {
            globalNotes: [],
            executionFiles: [],
            vaultDocs: [],
            lawsuitFiles: [
                {
                    id: 22,
                    title: 'دعوى',
                    type: 'lawsuit',
                    stages: [
                        {
                            id: 'stage-1',
                            name: 'stage',
                            timeline: [
                                {
                                    id: 'corr_2',
                                    type: 'note',
                                    title: 'مخاطبة',
                                    details: 'نص',
                                    date: '2026-07-04T12:00:00.000Z',
                                    isDeleted: false,
                                },
                            ],
                        },
                    ],
                } as never,
            ],
        };

        const before = buildRepositoryFeedCacheKey(baseInput);
        const after = buildRepositoryFeedCacheKey({
            ...baseInput,
            lawsuitFiles: [
                {
                    ...baseInput.lawsuitFiles[0],
                    stages: [
                        {
                            ...baseInput.lawsuitFiles[0].stages[0],
                            timeline: [
                                {
                                    ...baseInput.lawsuitFiles[0].stages[0].timeline[0],
                                    isDeleted: true,
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        expect(after).not.toBe(before);
    });
});
