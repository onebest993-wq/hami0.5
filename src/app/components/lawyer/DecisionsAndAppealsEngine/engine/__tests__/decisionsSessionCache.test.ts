import { describe, expect, it, beforeEach } from 'vitest';
import {
    readDecisionsSessionCache,
    writeDecisionsSessionCache,
    clearDecisionsSessionCache,
    clearAllDecisionsSessionCachesForTests,
    clearDecisionsMemoryCacheOnlyForTests,
} from '../decisionsSessionCache';
import type { Decision } from '../../types';

describe('decisionsSessionCache', () => {
    const execId = 'exec-session-cache-test';

    beforeEach(() => {
        clearAllDecisionsSessionCachesForTests();
    });

    it('يعيد اللقطة بعد الكتابة', () => {
        clearDecisionsSessionCache(execId);
        const rows: Decision[] = [
            {
                id: 'd-1',
                title: 'قرار',
                body: '',
                date: '2026-06-01',
                appealStatus: 'pending',
            },
        ];
        writeDecisionsSessionCache(execId, rows);
        const hit = readDecisionsSessionCache(execId);
        expect(hit?.map((d) => d.id)).toEqual(['d-1']);
        expect(hit?.[0]).not.toBe(rows[0]);
    });

    it('يتجاهل معرّف default', () => {
        writeDecisionsSessionCache('default', [{ id: 'x' } as Decision]);
        expect(readDecisionsSessionCache('default')).toBeUndefined();
    });

    it('يبقى في sessionStorage بعد مسح الذاكرة الداخلية', () => {
        const rows: Decision[] = [
            {
                id: 'persist-1',
                title: 'قرار',
                body: '',
                date: '2026-06-01',
                appealStatus: 'pending',
            },
        ];
        writeDecisionsSessionCache(execId, rows);
        clearDecisionsMemoryCacheOnlyForTests();
        const hit = readDecisionsSessionCache(execId);
        expect(hit?.map((d) => d.id)).toEqual(['persist-1']);
    });
});
