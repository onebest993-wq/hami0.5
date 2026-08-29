import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const { kvStatusMock } = vi.hoisted(() => ({
    kvStatusMock: vi.fn(),
}));

vi.mock('../kvStoreAdmin.ts', () => ({
    kvReadJsonStatusByPrefix: (...a: unknown[]) => kvStatusMock(...a),
}));

import { emptyHeadquartersStatus, loadHeadquartersStatus, hqFrozenProfilesOrFilter, hqLoginLockedProfilesOrFilter, HQ_FROZEN_PROFILES_LEGACY_OR } from '../headquartersStatus.ts';

type CountResult = { count: number | null; error: { message: string } | null };

const NOW_MS = Date.parse('2026-08-27T21:00:00.000Z');
const NOW_ISO = new Date(NOW_MS).toISOString();
const SINCE_24H = new Date(NOW_MS - 24 * 60 * 60 * 1000).toISOString();
const SINCE_7D = new Date(NOW_MS - 7 * 24 * 60 * 60 * 1000).toISOString();
const FROZEN_OR = hqFrozenProfilesOrFilter(NOW_ISO);
const LOCKED_OR = hqLoginLockedProfilesOrFilter(NOW_ISO);

function makeAdmin(map: Record<string, CountResult>): SupabaseClient {
    return {
        from(table: string) {
            const filters: string[] = [];
            const settle = (): CountResult => {
                const key = [table, ...filters].join('|');
                return map[key] ?? map[table] ?? { count: 0, error: null };
            };
            const thenable = {
                eq(column: string, value: unknown) {
                    filters.push(`eq:${column}:${String(value)}`);
                    return thenable;
                },
                or(filtersExpr: string) {
                    filters.push(`or:${filtersExpr}`);
                    return thenable;
                },
                is(column: string, value: unknown) {
                    filters.push(`is:${column}:${String(value)}`);
                    return thenable;
                },
                not(column: string, operator: string, value: unknown) {
                    filters.push(`not:${column}:${operator}:${String(value)}`);
                    return thenable;
                },
                gt(column: string, value: unknown) {
                    filters.push(`gt:${column}:${String(value)}`);
                    return thenable;
                },
                gte(column: string, value: unknown) {
                    filters.push(`gte:${column}:${String(value)}`);
                    return thenable;
                },
                then(onFulfilled?: (value: CountResult) => unknown, onRejected?: (reason: unknown) => unknown) {
                    return Promise.resolve(settle()).then(onFulfilled, onRejected);
                },
            };
            return {
                select() {
                    return thenable;
                },
            };
        },
    } as unknown as SupabaseClient;
}

const HAPPY: Record<string, CountResult> = {
    'profiles|eq:is_deleted:false': { count: 10, error: null },
    [`profiles|eq:is_deleted:false|or:${FROZEN_OR}`]: { count: 2, error: null },
    [`profiles|eq:is_deleted:false|or:${LOCKED_OR}`]: { count: 0, error: null },
    [`profiles|eq:is_deleted:false|or:${LOCKED_OR}|or:${FROZEN_OR}`]: { count: 0, error: null },
    [`profiles|eq:is_deleted:false|or:${HQ_FROZEN_PROFILES_LEGACY_OR}`]: { count: 2, error: null },
    'profiles|eq:is_deleted:false|eq:role:lawyer': { count: 7, error: null },
    'profiles|eq:is_deleted:false|eq:role:moderator': { count: 2, error: null },
    'profiles|eq:is_deleted:false|eq:role:admin': { count: 1, error: null },
    [`profiles|eq:is_deleted:false|gte:created_at:${SINCE_24H}`]: { count: 1, error: null },
    [`profiles|eq:is_deleted:false|gte:created_at:${SINCE_7D}`]: { count: 3, error: null },
    'forum_reports|eq:status:pending': { count: 3, error: null },
    'forum_comment_reports|eq:status:pending': { count: 1, error: null },
    'forum_posts|is:group_id:null': { count: 40, error: null },
    forum_comments: { count: 12, error: null },
    forum_bans: { count: 4, error: null },
    'forum_bans|is:expires_at:null': { count: 2, error: null },
    [`forum_bans|gt:expires_at:${NOW_ISO}`]: { count: 1, error: null },
    'forum_posts|is:group_id:null|not:attachment:is:null': { count: 5, error: null },
    'forum_posts|is:group_id:null|eq:is_pinned:true': { count: 2, error: null },
    'forum_posts|is:group_id:null|eq:is_locked:true': { count: 1, error: null },
};

describe('loadHeadquartersStatus', () => {
    beforeEach(() => {
        kvStatusMock.mockReset();
        kvStatusMock.mockResolvedValue({
            statuses: ['pending', 'pending', 'active', 'rejected', 'unknown'],
            capped: false,
        });
    });

    it('يجمع أعداد الحسابات والتوثيق والمنتدى دون اختراع أرقام', async () => {
        const payload = await loadHeadquartersStatus(makeAdmin(HAPPY), NOW_MS);
        expect(payload).toEqual({
            system: 'connected',
            db: true,
            kvOk: true,
            pendingVerification: 2,
            verificationApproved: 1,
            verificationRejected: 1,
            pendingReports: 3,
            pendingCommentReports: 1,
            usersTotal: 10,
            usersFrozen: 2,
            usersLocked: 0,
            usersActive: 8,
            usersLawyer: 7,
            usersModerator: 2,
            usersAdmin: 1,
            usersNew24h: 1,
            usersNew7d: 3,
            forumPosts: 40,
            forumComments: 12,
            forumBans: 4,
            forumBansActive: 3,
            forumDocuments: 5,
            forumPinned: 2,
            forumLocked: 1,
            verificationCapped: false,
            contentPartial: false,
            contentGaps: [],
        });
        expect(kvStatusMock).toHaveBeenCalledWith('lawyer-verification:');
    });

    it('جدول بلاغات التعليقات المفقود يعيد صفراً ولا يُسقط القاعدة', async () => {
        const payload = await loadHeadquartersStatus(
            makeAdmin({
                ...HAPPY,
                'forum_comment_reports|eq:status:pending': {
                    count: null,
                    error: { message: 'relation "forum_comment_reports" does not exist' },
                },
            }),
            NOW_MS,
        );
        expect(payload.db).toBe(true);
        expect(payload.system).toBe('connected');
        expect(payload.pendingCommentReports).toBe(0);
        expect(payload.pendingReports).toBe(3);
        expect(payload.contentPartial).toBe(true);
        expect(payload.contentGaps).toEqual(['pendingCommentReports']);
    });

    it('فشل جدول الحسابات يعلن انقطاع القاعدة', async () => {
        const payload = await loadHeadquartersStatus(
            makeAdmin({
                ...HAPPY,
                'profiles|eq:is_deleted:false': { count: null, error: { message: 'permission denied' } },
            }),
            NOW_MS,
        );
        expect(payload.db).toBe(false);
        expect(payload.system).toBe('down');
        expect(payload.usersTotal).toBe(0);
        expect(payload.usersActive).toBe(0);
        expect(payload.contentGaps).toContain('usersTotal');
        expect(payload.contentGaps).toContain('usersActive');
    });

    it('فشل مخزن التوثيق يبقي القاعدة ويعيد التوثيق صفراً بحالة متقطعة', async () => {
        kvStatusMock.mockRejectedValue(new Error('kv down'));
        const payload = await loadHeadquartersStatus(makeAdmin(HAPPY), NOW_MS);
        expect(payload.db).toBe(true);
        expect(payload.kvOk).toBe(false);
        expect(payload.system).toBe('degraded');
        expect(payload.pendingVerification).toBe(0);
        expect(payload.verificationApproved).toBe(0);
        expect(payload.verificationRejected).toBe(0);
        expect(payload.usersTotal).toBe(10);
        expect(payload.contentPartial).toBe(true);
        expect(payload.contentGaps).toEqual(['pendingVerification']);
    });

    it('يعدّ كل التعليقات دون تضمين علاقة هشّة', async () => {
        const payload = await loadHeadquartersStatus(
            makeAdmin({
                ...HAPPY,
                forum_comments: { count: 8, error: null },
            }),
            NOW_MS,
        );
        expect(payload.forumComments).toBe(8);
        expect(payload.contentPartial).toBe(false);
        expect(payload.contentGaps).toEqual([]);
    });

    it('فشل عدّ تعليقات المنتدى يعلن نقص المحتوى ولا يخترع رقماً', async () => {
        const payload = await loadHeadquartersStatus(
            makeAdmin({
                ...HAPPY,
                forum_comments: {
                    count: null,
                    error: { message: 'could not find the relationship' },
                },
            }),
            NOW_MS,
        );
        expect(payload.forumComments).toBe(0);
        expect(payload.contentPartial).toBe(true);
        expect(payload.contentGaps).toEqual(['forumComments']);
        expect(payload.db).toBe(true);
        expect(payload.forumPosts).toBe(40);
    });

    it('emptyHeadquartersStatus يعلن انقطاعاً بفجوات لا بأصفار كواقع', () => {
        const empty = emptyHeadquartersStatus('down');
        expect(empty.forumPosts).toBe(0);
        expect(empty.forumBansActive).toBe(0);
        expect(empty.verificationCapped).toBe(false);
        expect(empty.contentPartial).toBe(true);
        expect(empty.contentGaps).toContain('usersTotal');
        expect(empty.contentGaps).toContain('pendingVerification');
        expect(empty.db).toBe(false);
        expect(empty.system).toBe('down');
        expect(empty.usersLocked).toBe(0);
    });

    it('لا يخترع صفر محامين عند فشل العدّ', async () => {
        const payload = await loadHeadquartersStatus(
            makeAdmin({
                ...HAPPY,
                'profiles|eq:is_deleted:false|eq:role:lawyer': {
                    count: null,
                    error: { message: 'timeout' },
                },
            }),
            NOW_MS,
        );
        expect(payload.usersLawyer).toBe(0);
        expect(payload.contentPartial).toBe(true);
        expect(payload.contentGaps).toContain('usersLawyer');
        expect(payload.usersTotal).toBe(10);
    });

    it('يطرح مقفولي الدخول من النشطة دون عدّ مزدوج', async () => {
        const payload = await loadHeadquartersStatus(
            makeAdmin({
                ...HAPPY,
                [`profiles|eq:is_deleted:false|or:${LOCKED_OR}`]: { count: 3, error: null },
                [`profiles|eq:is_deleted:false|or:${LOCKED_OR}|or:${FROZEN_OR}`]: { count: 1, error: null },
            }),
            NOW_MS,
        );
        expect(payload.usersLocked).toBe(3);
        expect(payload.usersFrozen).toBe(1);
        expect(payload.usersActive).toBe(6);
    });

    it('يعود لتعريف التجميد القديم إن غاب freeze_until', async () => {
        const payload = await loadHeadquartersStatus(
            makeAdmin({
                ...HAPPY,
                [`profiles|eq:is_deleted:false|or:${FROZEN_OR}`]: {
                    count: null,
                    error: { message: 'column freeze_until does not exist' },
                },
            }),
            NOW_MS,
        );
        expect(payload.usersFrozen).toBe(2);
        expect(payload.contentGaps).not.toContain('usersFrozen');
    });
});
