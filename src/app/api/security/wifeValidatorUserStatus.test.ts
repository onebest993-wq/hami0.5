import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * فحص الإبطال الحيّ: هل ما يزال صاحب التوكن المُتحقَّق منه مسموحاً له؟
 *
 * كانت قراءة الصفّ تُعيد `null` لحالتين مختلفتين تماماً — «لا صفّ» و«تعذّر
 * السؤال» — فيقرأ الفحص العطل العابر على أنه «مستخدم جديد بلا ملفّ» ويأذن له،
 * ثم يُخزّن الإذن خمس دقائق. استعلام فاشل واحد كان يفتح الباب لمحامٍ محظور.
 */

const maybeSingle = vi.fn();

const adminClient = {
    from: () => ({
        select: () => ({
            or: () => ({ limit: () => ({ maybeSingle }) }),
            eq: () => ({ limit: () => ({ maybeSingle }) }),
        }),
    }),
};

const getSupabaseAdminClient = vi.fn(() => adminClient);

vi.mock('./supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => getSupabaseAdminClient(),
}));

import {
    getVerifiedTokenSubject,
    resetWifeValidatorCachesForTests,
} from './wifeValidator.ts';

const USER_ID = 'user-status-subject';
const TOKEN = 'header.payload.signature-long-enough-to-pass-length-check';

const originalNodeEnv = process.env.NODE_ENV;

/** Supabase تُقرّ بالتوكن؛ الخلاف كلّه على ما تقوله قاعدة البيانات بعدها */
function stubSupabaseAuthAccepts(): void {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify({ id: USER_ID }), { status: 200 })),
    );
}

describe('الإبطال الحيّ عند تعذّر قراءة صفّ المستخدم', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'production';
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        resetWifeValidatorCachesForTests();
        maybeSingle.mockReset();
        // mockClear وحده يُبقي قيمة الإرجاع، فتتسرّب حالة «لا عميل» إلى ما بعدها
        getSupabaseAdminClient.mockReset();
        getSupabaseAdminClient.mockReturnValue(adminClient);
        stubSupabaseAuthAccepts();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        vi.unstubAllGlobals();
    });

    it('يمنع حين يفشل الاستعلام — لا يقرأ العطل «مستخدماً جديداً»', async () => {
        maybeSingle.mockResolvedValue({ data: null, error: { message: 'connection reset' } });

        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBeNull();
    });

    it('يمنع حين يتعذّر بناء عميل الإدارة أصلاً', async () => {
        getSupabaseAdminClient.mockReturnValue(null as unknown as typeof adminClient);

        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBeNull();
    });

    it('لا يُخزّن حكم المنع — الطلب التالي يسأل من جديد', async () => {
        maybeSingle.mockResolvedValue({ data: null, error: { message: 'connection reset' } });
        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBeNull();

        maybeSingle.mockResolvedValue({ data: { id: USER_ID, status: 'active' }, error: null });
        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBe(USER_ID);
    });

    it('لا يجمّد إذن الغياب — قفل الدخول يظهر في الطلب التالي', async () => {
        maybeSingle.mockResolvedValue({ data: null, error: null });
        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBe(USER_ID);

        maybeSingle.mockResolvedValue({ data: { id: USER_ID, login_blocked: true }, error: null });
        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBeNull();
    });

    it('يمنع مقفول الدخول حين يُقرأ صفّه فعلاً', async () => {
        maybeSingle.mockResolvedValue({ data: { id: USER_ID, login_blocked: true }, error: null });

        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBeNull();
    });

    it('يبقي توكن التجميد الشبكي صالحاً للدخول', async () => {
        maybeSingle.mockResolvedValue({ data: { id: USER_ID, is_banned: true, status: 'suspended' }, error: null });

        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBe(USER_ID);
    });

    it('يأذن للنشط', async () => {
        maybeSingle.mockResolvedValue({ data: { id: USER_ID, status: 'active' }, error: null });

        await expect(getVerifiedTokenSubject(TOKEN)).resolves.toBe(USER_ID);
    });
});
