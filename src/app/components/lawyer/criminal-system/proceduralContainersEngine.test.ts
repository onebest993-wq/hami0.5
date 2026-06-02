import { describe, expect, it } from 'vitest';
import {
    advanceActionToNextPhase,
    appendSubItem,
    buildProceduralAttentionBoard,
    buildProceduralPlacementContext,
    buildProceduralSearchVisibility,
    createProceduralId,
    findProceduralReferencesToLink,
    formatProceduralPathsForExport,
    searchProceduralTree,
    duplicateSubItemInTree,
    findActionAnchorInTree,
    isFollowUpDueOrOverdue,
    parseTagsInput,
    deleteContainerFromTree,
    insertNestedContainer,
    insertRootContainer,
    migrateLegacyPathsToContainers,
    moveContainerInTree,
    moveSubItemInTree,
    normalizeProceduralContainers,
    reorderRootContainers,
} from './proceduralContainersEngine';

describe('proceduralContainersEngine', () => {
    it('isFollowUpDueOrOverdue compares ISO dates', () => {
        expect(isFollowUpDueOrOverdue('2026-05-20', '2026-05-19')).toBe(false);
        expect(isFollowUpDueOrOverdue('2026-05-20', '2026-05-20')).toBe(true);
        expect(isFollowUpDueOrOverdue('2026-05-20', '2026-05-21')).toBe(true);
    });

    it('normalizes followUpDate only for in_progress actions', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r1',
                title: 'جذر',
                color: '#E6C673',
                icon: '🛤️',
                subItems: [
                    {
                        type: 'action',
                        id: 'a1',
                        title: 'متابعة',
                        date: '2026-05-01',
                        status: 'in_progress',
                        followUpDate: '2026-05-20',
                    },
                    {
                        type: 'action',
                        id: 'a2',
                        title: 'منجز',
                        date: '2026-05-02',
                        status: 'done',
                        followUpDate: '2026-05-20',
                    },
                ],
            },
        ]);
        const active = roots[0]?.subItems[0];
        const done = roots[0]?.subItems[1];
        expect(active?.type).toBe('action');
        expect(done?.type).toBe('action');
        if (active?.type === 'action') expect(active.followUpDate).toBe('2026-05-20');
        if (done?.type === 'action') expect(done.followUpDate).toBeUndefined();
    });

    it('normalizes nested branchRole (primary vs sub)', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r1',
                title: 'جذر',
                color: '#E6C673',
                icon: '🛤️',
                subItems: [
                    {
                        type: 'container',
                        container: {
                            id: 'p1',
                            title: 'أساسي',
                            branchRole: 'primary',
                            color: '#38bdf8',
                            icon: '🛤️',
                            subItems: [],
                        },
                    },
                    {
                        type: 'container',
                        container: {
                            id: 's1',
                            title: 'فرعي',
                            branchRole: 'sub',
                            color: '#a78bfa',
                            icon: '📁',
                            subItems: [],
                        },
                    },
                ],
            },
        ]);
        const primary = roots[0]?.subItems[0];
        const sub = roots[0]?.subItems[1];
        expect(primary?.type).toBe('container');
        expect(sub?.type).toBe('container');
        if (primary?.type === 'container') expect(primary.container.branchRole).toBe('primary');
        if (sub?.type === 'container') expect(sub.container.branchRole).toBe('sub');
    });

    it('normalizes note/action links and legacy contextRef', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r1',
                title: 'جذر',
                color: '#E6C673',
                icon: '📁',
                subItems: [
                    {
                        type: 'note',
                        id: 'n1',
                        title: 'ملاحظة',
                        link: { kind: 'timeline', id: 't1', label: 'جلسة' },
                        contextNote: 'إضافي',
                    },
                    {
                        type: 'action',
                        id: 'a1',
                        title: 'إجراء',
                        date: '2026-05-01',
                        status: 'in_progress',
                        contextRef: 'مرجع قديم',
                    },
                ],
            },
        ]);
        const note = roots[0]?.subItems[0];
        const action = roots[0]?.subItems[1];
        expect(note?.type).toBe('note');
        if (note?.type === 'note') {
            expect(note.link?.id).toBe('t1');
            expect(note.contextNote).toBe('إضافي');
        }
        expect(action?.type).toBe('action');
        if (action?.type === 'action') {
            expect(action.contextNote).toBe('مرجع قديم');
            expect(action.contextRef).toBe('مرجع قديم');
        }
    });

    it('normalizes nested containers and sub items', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r1',
                title: 'جذر',
                color: '#E6C673',
                icon: '📁',
                subItems: [
                    { type: 'note', id: 'n1', title: 'ملاحظة' },
                    {
                        type: 'container',
                        container: {
                            id: 'c2',
                            title: 'فرعي',
                            color: '#38bdf8',
                            subItems: [{ type: 'action', id: 'a1', title: 'إجراء', date: '2026-05-01', status: 'in_progress' }],
                        },
                    },
                ],
            },
        ]);
        expect(roots).toHaveLength(1);
        expect(roots[0]?.subItems).toHaveLength(2);
        const nested = roots[0]?.subItems[1];
        expect(nested?.type).toBe('container');
        if (nested?.type === 'container') {
            expect(nested.container.parentId).toBe('r1');
            expect(nested.container.subItems).toHaveLength(1);
        }
    });

    it('migrates legacy flat paths to root containers', () => {
        const migrated = migrateLegacyPathsToContainers([
            {
                id: 'p1',
                name: 'مسار قديم',
                color: '#a78bfa',
                items: [{ id: 's1', title: 'خطوة', date: '2026-04-01', status: 'done' }],
            },
        ]);
        expect(migrated[0]?.title).toBe('مسار قديم');
        expect(migrated[0]?.subItems[0]?.type).toBe('action');
    });

    it('supports unlimited nesting via insertNestedContainer', () => {
        const rootId = createProceduralId();
        let roots = insertRootContainer([], {
            id: rootId,
            title: 'A',
            color: '#E6C673',
            icon: '📁',
            parentId: null,
            subItems: [],
        });
        const bId = createProceduralId();
        roots = insertNestedContainer(roots, rootId, {
            id: bId,
            title: 'B',
            color: '#38bdf8',
            icon: '📋',
            parentId: rootId,
            subItems: [],
        });
        const cId = createProceduralId();
        roots = insertNestedContainer(roots, bId, {
            id: cId,
            title: 'C',
            color: '#34d399',
            icon: '💡',
            parentId: bId,
            subItems: [],
        });
        roots = appendSubItem(roots, cId, { type: 'note', id: 'n-deep', title: 'عمق' });
        const norm = normalizeProceduralContainers(roots);
        const nested = norm[0]?.subItems[0];
        expect(nested?.type).toBe('container');
        if (nested?.type === 'container') {
            const deep = nested.container.subItems[0];
            expect(deep?.type).toBe('container');
        }
    });

    it('buildProceduralPlacementContext returns breadcrumb and inherited number chain', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'root-1',
                title: 'تحقيق',
                color: '#E6C673',
                subItems: [
                    {
                        type: 'container',
                        container: {
                            id: 'phase-b',
                            title: 'فرع',
                            color: '#38bdf8',
                            icon: '📁',
                            parentId: 'root-1',
                            branchRole: 'sub',
                            subItems: [{ type: 'note', id: 'n1', title: 'ملاحظة' }],
                        },
                    },
                ],
            },
        ]);
        const ctx = buildProceduralPlacementContext(roots, 'phase-b');
        expect(ctx?.numberChain).toBe('1.1');
        expect(ctx?.breadcrumb).toEqual(['تحقيق', 'فرع']);
        expect(ctx?.breadcrumbLine).toBe('تحقيق › فرع');
    });

    it('findProceduralReferencesToLink finds notes and actions pointing at a request', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'root-1',
                title: 'مسار',
                color: '#E6C673',
                subItems: [
                    {
                        type: 'note',
                        id: 'n1',
                        title: 'ملاحظة مرتبطة',
                        link: { kind: 'request', id: 'req-9', label: 'طلب' },
                    },
                    {
                        type: 'action',
                        id: 'a1',
                        title: 'إجراء',
                        date: '2026-05-01',
                        status: 'in_progress',
                    },
                ],
            },
        ]);
        const refs = findProceduralReferencesToLink(roots, { kind: 'request', id: 'req-9' });
        expect(refs).toHaveLength(1);
        expect(refs[0]?.itemId).toBe('n1');
        expect(refs[0]?.numberChain).toBe('1.1');
    });

    it('searchProceduralTree and visibility expand matching branches', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r1',
                title: 'طب عدلي',
                color: '#E6C673',
                subItems: [{ type: 'note', id: 'n-x', title: 'تقرير الخبراء' }],
            },
            {
                id: 'r2',
                title: 'تحقيق',
                color: '#38bdf8',
                subItems: [],
            },
        ]);
        const hits = searchProceduralTree(roots, 'خبراء');
        expect(hits.some((h) => h.itemId === 'n-x')).toBe(true);
        const vis = buildProceduralSearchVisibility(roots, 'خبراء');
        expect(vis.active).toBe(true);
        expect(vis.visibleContainerIds.has('r1')).toBe(true);
        expect(vis.visibleContainerIds.has('r2')).toBe(false);
    });

    it('formatProceduralPathsForExport renders outline text', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r1',
                title: 'مسار أ',
                color: '#E6C673',
                subItems: [{ type: 'note', id: 'n1', title: 'خطوة' }],
            },
        ]);
        const text = formatProceduralPathsForExport(roots);
        expect(text).toContain('مسار أ');
        expect(text).toContain('[ملاحظة] خطوة');
    });

    it('advanceActionToNextPhase marks done and spawns child container', () => {
        const parentId = 'p';
        const actionId = 'a1';
        const roots = normalizeProceduralContainers([
            {
                id: parentId,
                title: 'مرحلة',
                color: '#E6C673',
                subItems: [{ type: 'action', id: actionId, title: 'طلب', date: '2026-05-01', status: 'in_progress' }],
            },
        ]);
        const next = advanceActionToNextPhase(roots, parentId, actionId, {
            spawnChildContainer: { title: 'مرحلة تالية' },
        });
        const action = next[0]?.subItems.find((i) => i.type === 'action');
        expect(action?.type === 'action' && action.status).toBe('done');
        expect(next[0]?.subItems.some((i) => i.type === 'container')).toBe(true);
    });

    it('moveSubItemInTree and moveContainerInTree reorder across parents', () => {
        const r1 = 'r1';
        const r2 = 'r2';
        let roots = normalizeProceduralContainers([
            { id: r1, title: '1', color: '#E6C673', subItems: [{ type: 'note', id: 'n1', title: 'نقل' }] },
            { id: r2, title: '2', color: '#38bdf8', subItems: [] },
        ]);
        roots = moveSubItemInTree(roots, r1, r2, 'n1', 0);
        expect(roots.find((c) => c.id === r2)?.subItems).toHaveLength(1);
        roots = moveContainerInTree(roots, r2, null, 0);
        expect(roots[0]?.id).toBe(r2);
    });

    it('deleteContainerFromTree removes nested containers', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r',
                title: 'R',
                color: '#E6C673',
                subItems: [{ type: 'container', container: { id: 'nested', title: 'N', color: '#fff', subItems: [] } }],
            },
        ]);
        const next = deleteContainerFromTree(roots, 'nested');
        expect(next[0]?.subItems).toHaveLength(0);
    });

    it('normalizes root pathStatus and end date', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'p1',
                title: 'مسار أ',
                color: '#E6C673',
                pathStatus: 'completed',
                pathEndedAt: '2026-05-20',
                subItems: [],
            },
        ]);
        expect(roots[0]?.pathStatus).toBe('completed');
        expect(roots[0]?.pathEndedAt).toBe('2026-05-20');
    });

    it('reorderRootContainers swaps root order', () => {
        const roots = normalizeProceduralContainers([
            { id: 'a', title: 'A', color: '#E6C673', subItems: [] },
            { id: 'b', title: 'B', color: '#38bdf8', subItems: [] },
        ]);
        const next = reorderRootContainers(roots, 'b', 'a');
        expect(next[0]?.id).toBe('b');
    });

    it('parseTagsInput splits Arabic and ASCII commas', () => {
        expect(parseTagsInput('مستعجل، خطير, رشوة')).toEqual(['مستعجل', 'خطير', 'رشوة']);
    });

    it('normalizes tags and isStarred on notes and actions', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r1',
                title: 'جذر',
                color: '#E6C673',
                subItems: [
                    { type: 'note', id: 'n1', title: 'ملاحظة', tags: ['أ'], isStarred: true },
                    {
                        type: 'action',
                        id: 'a1',
                        title: 'إجراء',
                        date: '2026-05-01',
                        status: 'in_progress',
                        tags: ['ب'],
                        isStarred: true,
                    },
                ],
            },
        ]);
        const note = roots[0]?.subItems[0];
        const action = roots[0]?.subItems[1];
        if (note?.type === 'note') {
            expect(note.tags).toEqual(['أ']);
            expect(note.isStarred).toBe(true);
        }
        if (action?.type === 'action') {
            expect(action.tags).toEqual(['ب']);
            expect(action.isStarred).toBe(true);
        }
    });

    it('buildProceduralAttentionBoard buckets in_progress actions by followUpDate', () => {
        const board = buildProceduralAttentionBoard(
            normalizeProceduralContainers([
                {
                    id: 'r1',
                    title: 'مسار',
                    color: '#E6C673',
                    subItems: [
                        {
                            type: 'action',
                            id: 'a1',
                            title: 'متأخر',
                            date: '2026-05-01',
                            status: 'in_progress',
                            followUpDate: '2026-05-10',
                        },
                        {
                            type: 'action',
                            id: 'a2',
                            title: 'اليوم',
                            date: '2026-05-01',
                            status: 'in_progress',
                            followUpDate: '2026-05-20',
                        },
                        {
                            type: 'action',
                            id: 'a3',
                            title: 'بلا موعد',
                            date: '2026-05-01',
                            status: 'in_progress',
                        },
                        {
                            type: 'action',
                            id: 'a4',
                            title: 'منجز',
                            date: '2026-05-01',
                            status: 'done',
                            followUpDate: '2026-05-01',
                        },
                    ],
                },
            ]),
            '2026-05-20',
        );
        expect(board.total).toBe(3);
        expect(board.overdue.map((x) => x.actionId)).toEqual(['a1']);
        expect(board.upcoming.map((x) => x.actionId)).toEqual(['a2']);
        expect(board.noDate.map((x) => x.actionId)).toEqual(['a3']);
    });

    it('findActionAnchorInTree returns container chain', () => {
        const roots = normalizeProceduralContainers([
            {
                id: 'r1',
                title: 'جذر',
                color: '#E6C673',
                subItems: [
                    {
                        type: 'container',
                        container: {
                            id: 'c1',
                            title: 'فرع',
                            color: '#38bdf8',
                            subItems: [
                                {
                                    type: 'action',
                                    id: 'act1',
                                    title: 'إجراء',
                                    date: '2026-05-01',
                                    status: 'in_progress',
                                },
                            ],
                        },
                    },
                ],
            },
        ]);
        const anchor = findActionAnchorInTree(roots, 'act1');
        expect(anchor?.parentId).toBe('c1');
        expect(anchor?.expandContainerIds).toEqual(['r1', 'c1']);
    });

    it('duplicateSubItemInTree inserts clone below original with new id', () => {
        const rootId = createProceduralId();
        let roots = insertRootContainer([], {
            id: rootId,
            title: 'مسار',
            color: '#E6C673',
            icon: '🛤️',
            parentId: null,
            subItems: [],
        });
        const noteId = createProceduralId();
        roots = appendSubItem(roots, rootId, {
            type: 'note',
            id: noteId,
            title: 'أصل',
            tags: ['x'],
            isStarred: true,
        });
        const duped = duplicateSubItemInTree(roots, rootId, noteId);
        expect(duped).not.toBeNull();
        const items = duped![0]!.subItems;
        expect(items).toHaveLength(2);
        expect(items[0]?.type).toBe('note');
        expect(items[1]?.type).toBe('note');
        if (items[0]?.type === 'note' && items[1]?.type === 'note') {
            expect(items[1].id).not.toBe(items[0].id);
            expect(items[1].title).toBe('أصل');
            expect(items[1].tags).toEqual(['x']);
            expect(items[1].isStarred).toBe(true);
        }
    });
});
