import { describe, expect, it } from 'vitest';
import {
    isPoorerLawsuitActiveList,
    mergeRicherLawsuitActive,
} from '../lawsuitActiveDurability';
import type { FileData } from '../lawsuitFileTypes';

const file = (id: number): FileData => ({
    id,
    type: 'lawsuit',
    status: 'active',
    caseNo: `2026/ب/${id}`,
    court: 'أحوال',
    parties: [],
    history: [],
    notes: [],
    images: [],
    date: '2026-01-01',
});

describe('lawsuitActiveDurability', () => {
    it('detects poorer list that drops ids', () => {
        expect(isPoorerLawsuitActiveList([file(2)], [file(1), file(2)])).toBe(true);
        expect(isPoorerLawsuitActiveList([], [file(1)])).toBe(true);
        expect(isPoorerLawsuitActiveList([file(1), file(2)], [file(1)])).toBe(false);
        expect(isPoorerLawsuitActiveList([file(1)], [file(1)])).toBe(false);
    });

    it('merge keeps existing ids when create list is partial', () => {
        const merged = mergeRicherLawsuitActive([file(3)], [file(1), file(2)]);
        expect(merged.map((f) => String(f.id)).sort()).toEqual(['1', '2', '3']);
        expect(merged[0]?.id).toBe(3);
    });
});
