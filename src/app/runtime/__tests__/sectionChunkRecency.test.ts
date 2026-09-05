import { afterEach, describe, expect, it } from 'vitest';
import {
    peekLastOpenedSectionChunk,
    rememberOpenedSectionChunk,
    resetSectionChunkRecencyForTests,
} from '@/app/runtime/sectionChunkRecency';
import { sectionChunkIdFromDockWidget } from '@/app/runtime/sectionChunkPreload';

describe('section chunk recency', () => {
    afterEach(() => {
        resetSectionChunkRecencyForTests();
    });

    it('يحفظ آخر قسم ويقرأه', () => {
        expect(peekLastOpenedSectionChunk()).toBeNull();
        rememberOpenedSectionChunk('forum');
        expect(peekLastOpenedSectionChunk()).toBe('forum');
        rememberOpenedSectionChunk('execution');
        expect(peekLastOpenedSectionChunk()).toBe('execution');
    });

    it('يرفض قيماً غير معروفة', () => {
        window.localStorage.setItem('hami:section-chunk-recency', 'not-a-section');
        expect(peekLastOpenedSectionChunk()).toBeNull();
    });

    it('يربط أيقونة الدوك بقسم الكِسرة', () => {
        expect(sectionChunkIdFromDockWidget('forum')).toBe('forum');
        expect(sectionChunkIdFromDockWidget('dockCalendar')).toBe('schedule');
        expect(sectionChunkIdFromDockWidget('hubExecution')).toBe('execution');
        expect(sectionChunkIdFromDockWidget('dockRepository')).toBe('repository');
        expect(sectionChunkIdFromDockWidget('alerts')).toBe('notifications');
    });
});
