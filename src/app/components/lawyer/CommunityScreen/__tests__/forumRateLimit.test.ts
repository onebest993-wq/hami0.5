import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkForumRateLimit, peekForumRateLimit } from '../forumRateLimit';

// ┘╪│╪ز╪«╪»┘à mock localStorage ╪د┘╪░┘è ┘è┘ê┘╪▒┘ç setup.ts ┘ê┘┘à╪│╪ص┘ç ┘é╪ذ┘ ┘â┘ ╪د╪«╪ز╪ذ╪د╪▒
beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('checkForumRateLimit (client)', () => {
    describe('post action', () => {
        it('┘╪د ┘è┘╪▒╪╢ ╪د┘╪ز╪╕╪د╪▒╪د┘ï ╪ذ┘è┘ ╪د┘┘à┘╪┤┘ê╪▒╪د╪ز', () => {
            expect(checkForumRateLimit('post', 'user-1').allowed).toBe(true);
            expect(checkForumRateLimit('post', 'user-1').allowed).toBe(false);
        });

        it('يرفض معرّف مستخدم فارغ', () => {
            expect(checkForumRateLimit('post', '').allowed).toBe(false);
            expect(checkForumRateLimit('post', '   ').allowed).toBe(false);
        });
    });

    describe('peekForumRateLimit', () => {
        it('reads without consuming the quota', () => {
            expect(peekForumRateLimit('report', 'user-1', { postId: 'post-1' }).allowed).toBe(true);
            expect(peekForumRateLimit('report', 'user-1', { postId: 'post-1' }).allowed).toBe(true);
            expect(checkForumRateLimit('report', 'user-1', { postId: 'post-1' }).allowed).toBe(true);
            expect(peekForumRateLimit('report', 'user-1', { postId: 'post-1' }).allowed).toBe(false);
        });
    });

    describe('comment action (8s burst + 30/min)', () => {
        it('┘è╪│┘à╪ص ╪ذ╪ث┘ê┘ ╪ز╪╣┘┘è┘é', () => {
            const res = checkForumRateLimit('comment', 'user-1');
            expect(res.allowed).toBe(true);
        });

        it('┘è┘à┘╪╣ ╪ز╪╣┘┘è┘é ┘à╪ز╪ز╪د┘┘ ╪«┘╪د┘ 8 ╪س┘ê╪د┘┘', () => {
            checkForumRateLimit('comment', 'user-1');
            const res = checkForumRateLimit('comment', 'user-1');
            expect(res.allowed).toBe(false);
            if (res.allowed === false) {
                expect(res.retryAfterSec).toBeGreaterThan(0);
                expect(res.retryAfterSec).toBeLessThanOrEqual(8);
            }
        });
    });

    describe('report action (1/24h ┘┘â┘ ┘à┘╪┤┘ê╪▒)', () => {
        it('┘è╪│┘à╪ص ╪ذ╪ذ┘╪د╪║ ┘ê╪د╪ص╪» ┘┘â┘ ┘à┘╪┤┘ê╪▒', () => {
            const res = checkForumRateLimit('report', 'user-1', { postId: 'post-1' });
            expect(res.allowed).toBe(true);
        });

        it('┘è┘à┘╪╣ ╪ذ┘╪د╪║╪د┘ï ┘à┘â╪▒╪▒╪د┘ï ┘┘┘╪│ ╪د┘┘à┘╪┤┘ê╪▒ ╪«┘╪د┘ 24h', () => {
            checkForumRateLimit('report', 'user-1', { postId: 'post-1' });
            const dup = checkForumRateLimit('report', 'user-1', { postId: 'post-1' });
            expect(dup.allowed).toBe(false);
        });

        it('┘è╪│┘à╪ص ╪ذ╪د┘╪ح╪ذ┘╪د╪║ ╪╣┘ ┘à┘╪┤┘ê╪▒╪د╪ز ┘à╪«╪ز┘┘╪ر', () => {
            checkForumRateLimit('report', 'user-1', { postId: 'post-1' });
            const second = checkForumRateLimit('report', 'user-1', { postId: 'post-2' });
            expect(second.allowed).toBe(true);
        });
    });

    describe('╪┤╪ص┘ ╪ذ┘è╪د┘╪د╪ز ╪ز╪د┘┘╪ر ┘┘è localStorage', () => {
        it('┘è╪ز╪╣╪د┘┘ë ┘à┘ JSON ╪║┘è╪▒ ╪╡╪د┘╪ص', () => {
            window.localStorage.setItem('hami:forum:rate:comment:user-1', 'invalid-json-{');
            // ┘╪د ┘è╪▒┘à┘è ┘ê┘╪د ┘è┘à┘╪╣ ╪د┘┘à╪│╪ز╪«╪»┘à ╪ذ╪│╪ذ╪ذ ╪ذ┘è╪د┘╪د╪ز ╪ز╪د┘┘╪ر
            expect(() => checkForumRateLimit('comment', 'user-1')).not.toThrow();
            // ╪د╪ز╪╡╪د┘ ╪ت╪«╪▒ ┘à╪│╪ز╪«╪»┘à ┘è┘┘╪┤╪خ ╪│╪ش┘╪د┘ï ╪ش╪»┘è╪»╪د┘ï ┘╪╕┘è┘╪د┘ï
            const fresh = checkForumRateLimit('comment', 'user-2');
            expect(fresh.allowed).toBe(true);
        });

        it('┘è╪ز╪╣╪د┘┘ë ┘à┘ ╪┤┘â┘ ┘à╪«╪ز┘┘ (object ┘╪د╪▒╪║)', () => {
            window.localStorage.setItem('hami:forum:rate:post:user-1', JSON.stringify({ random: 'value' }));
            const res = checkForumRateLimit('post', 'user-1');
            expect(res.allowed).toBe(true);
        });
    });
});
