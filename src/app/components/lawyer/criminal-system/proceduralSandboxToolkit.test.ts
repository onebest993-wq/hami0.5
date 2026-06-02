import { describe, expect, it } from 'vitest';
import {
    appendProceduralAudit,
    buildSandboxTemplateRoots,
    cloneContainerWithNewIds,
    flattenContainersForPrint,
} from './proceduralSandboxToolkit';
import { normalizeProceduralContainers } from './proceduralContainersEngine';

describe('proceduralSandboxToolkit', () => {
    it('buildSandboxTemplateRoots returns generic empty structures', () => {
        const triple = buildSandboxTemplateRoots('triple-lanes');
        expect(triple).toHaveLength(3);
        expect(triple.every((c) => c.subItems.length === 0)).toBe(true);
    });

    it('cloneContainerWithNewIds regenerates ids', () => {
        const roots = normalizeProceduralContainers([
            { id: 'r', title: 'R', color: '#E6C673', subItems: [{ type: 'note', id: 'n1', title: 'x' }] },
        ]);
        const clone = cloneContainerWithNewIds(roots[0]!, null);
        expect(clone.id).not.toBe('r');
        expect(clone.subItems[0]?.type === 'note' && clone.subItems[0].id).not.toBe('n1');
    });

    it('appendProceduralAudit caps length', () => {
        let list = appendProceduralAudit([], 'أول');
        list = appendProceduralAudit(list, 'ثاني');
        expect(list).toHaveLength(2);
    });

    it('flattenContainersForPrint includes context ref', () => {
        const lines = flattenContainersForPrint(
            normalizeProceduralContainers([
                {
                    id: 'r',
                    title: 'مسار',
                    color: '#E6C673',
                    subItems: [
                        {
                            type: 'action',
                            id: 'a',
                            title: 'طلب',
                            date: '2026-05-01',
                            status: 'in_progress',
                            contextRef: 'جلسة 1',
                        },
                    ],
                },
            ]),
        );
        expect(lines.some((l) => l.meta?.includes('جلسة 1'))).toBe(true);
    });
});
