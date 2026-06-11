import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkForumRateLimit } from '../forumRateLimit';

// نستخدم mock localStorage الذي يوفره setup.ts ونمسحه قبل كل اختبار
beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('checkForumRateLimit (client)', () => {
    describe('post action', () => {
        it('لا يفرض انتظاراً بين المنشورات', () => {
            expect(checkForumRateLimit('post', 'user-1').allowed).toBe(true);
            expect(checkForumRateLimit('post', 'user-1').allowed).toBe(true);
        });
    });

    describe('comment action (8s burst + 30/min)', () => {
        it('يسمح بأول تعليق', () => {
            const res = checkForumRateLimit('comment', 'user-1');
            expect(res.allowed).toBe(true);
        });

        it('يمنع تعليق متتالٍ خلال 8 ثوانٍ', () => {
            checkForumRateLimit('comment', 'user-1');
            const res = checkForumRateLimit('comment', 'user-1');
            expect(res.allowed).toBe(false);
            if (res.allowed === false) {
                expect(res.retryAfterSec).toBeGreaterThan(0);
                expect(res.retryAfterSec).toBeLessThanOrEqual(8);
            }
        });
    });

    describe('report action (1/24h لكل منشور)', () => {
        it('يسمح ببلاغ واحد لكل منشور', () => {
            const res = checkForumRateLimit('report', 'user-1', { postId: 'post-1' });
            expect(res.allowed).toBe(true);
        });

        it('يمنع بلاغاً مكرراً لنفس المنشور خلال 24h', () => {
            checkForumRateLimit('report', 'user-1', { postId: 'post-1' });
            const dup = checkForumRateLimit('report', 'user-1', { postId: 'post-1' });
            expect(dup.allowed).toBe(false);
        });

        it('يسمح بالإبلاغ عن منشورات مختلفة', () => {
            checkForumRateLimit('report', 'user-1', { postId: 'post-1' });
            const second = checkForumRateLimit('report', 'user-1', { postId: 'post-2' });
            expect(second.allowed).toBe(true);
        });
    });

    describe('شحن بيانات تالفة في localStorage', () => {
        it('يتعافى من JSON غير صالح', () => {
            window.localStorage.setItem('hami:forum:rate:comment:user-1', 'invalid-json-{');
            // لا يرمي ولا يمنع المستخدم بسبب بيانات تالفة
            expect(() => checkForumRateLimit('comment', 'user-1')).not.toThrow();
            // اتصال آخر مستخدم يُنشئ سجلاً جديداً نظيفاً
            const fresh = checkForumRateLimit('comment', 'user-2');
            expect(fresh.allowed).toBe(true);
        });

        it('يتعافى من شكل مختلف (object فارغ)', () => {
            window.localStorage.setItem('hami:forum:rate:post:user-1', JSON.stringify({ random: 'value' }));
            const res = checkForumRateLimit('post', 'user-1');
            expect(res.allowed).toBe(true);
        });
    });
});
