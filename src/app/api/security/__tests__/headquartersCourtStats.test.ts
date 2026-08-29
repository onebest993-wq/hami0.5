import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    HEADQUARTERS_STATS_COURT_CAP,
    HEADQUARTERS_STATS_RPC_BUDGET_MS,
    HEADQUARTERS_STATS_SCAN_BUDGET_MS,
    listHeadquartersCourtStats,
    mergeCourtCounts,
} from '../headquartersCourtStats.ts';

function makeAdmin(
    lawsuits: unknown[],
    executions: unknown[],
    lawsuitError: { message: string } | null = null,
    execError: { message: string } | null = null,
    rpc?: { data: unknown; error: { message: string } | null },
): SupabaseClient {
    return {
        rpc: async () =>
            rpc ?? {
                data: null,
                error: { message: 'Could not find the function public.headquarters_court_counts' },
            },
        from(table: string) {
            const rows = table === 'lawsuit_files' ? lawsuits : executions;
            const error = table === 'lawsuit_files' ? lawsuitError : execError;
            return {
                select() {
                    return {
                        eq() {
                            return {
                                limit: async () => ({ data: error ? null : rows, error }),
                            };
                        },
                    };
                },
            };
        },
    } as unknown as SupabaseClient;
}

describe('headquartersCourtStats', () => {
    it('يجمع الدعاوى والتنفيذ حسب المحكمة ويطبيع الفراغ', async () => {
        const courts = await listHeadquartersCourtStats(
            makeAdmin(
                [{ court: '  بغداد  ' }, { court: '' }, { court: 'بغداد' }],
                [{ court: null }, { court: 'البصرة' }],
            ),
        );
        const byCourt = Object.fromEntries(courts.map((row) => [row.court, row]));
        expect(byCourt['بغداد']).toEqual({ court: 'بغداد', lawsuits: 2, transactions: 0 });
        expect(byCourt['غير محدد']).toEqual({ court: 'غير محدد', lawsuits: 1, transactions: 1 });
        expect(byCourt['البصرة']).toEqual({ court: 'البصرة', lawsuits: 0, transactions: 1 });
    });

    it('يزيل محارف التحكم من اسم المحكمة', async () => {
        const courts = await listHeadquartersCourtStats(
            makeAdmin([{ court: 'بغداد\u0000سري' }], []),
        );
        expect(courts[0]?.court).toBe('بغدادسري');
    });

    it('جدول مفقود يعيد قائمة فارغة لا خطأ', async () => {
        const courts = await listHeadquartersCourtStats(
            makeAdmin([], [], { message: 'relation "lawsuit_files" does not exist' }, {
                message: 'Could not find the table in the schema cache',
            }),
        );
        expect(courts).toEqual([]);
    });

    it('يقطع أسماء المحاكم الطويلة ويحدّ عدد البطاقات', () => {
        const lawsuits = new Map<string, number>();
        for (let i = 0; i < HEADQUARTERS_STATS_COURT_CAP + 5; i += 1) {
            lawsuits.set(`محكمة-${i}`, i + 1);
        }
        const merged = mergeCourtCounts(lawsuits, new Map());
        expect(merged).toHaveLength(HEADQUARTERS_STATS_COURT_CAP);
        expect(merged[0]?.lawsuits).toBeGreaterThan(merged[merged.length - 1]?.lawsuits ?? 0);
    });

    it('لا يختار encrypted_data', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/headquartersCourtStats.ts'),
            'utf8',
        );
        expect(src).toContain(".select('court')");
        expect(src).not.toContain('encrypted_data');
        expect(src).not.toContain('data_signature');
        expect(src).toContain("rpc('headquarters_court_counts')");
        expect(src).toContain('HEADQUARTERS_STATS_SCAN_BUDGET_MS');
        expect(src).toContain('return scanned ?? []');
        expect(src).toContain('listHeadquartersCourtStatsCached');
        expect(src).toContain("from './promiseBudget.ts'");
        expect(src).not.toContain('throw new Error');
    });

    it('يستخدم RPC عند التوفر ويمرّر التنفيذ إلى transactions', async () => {
        const courts = await listHeadquartersCourtStats(
            makeAdmin([], [], null, null, {
                data: [{ court: 'النجف', lawsuits: 4, executions: 7 }],
                error: null,
            }),
        );
        expect(courts).toEqual([{ court: 'النجف', lawsuits: 4, transactions: 7 }]);
    });

    it('RPC فارغ لا يُعتبر إجابة نهائية إذا الجداول فيها صفوف', async () => {
        const courts = await listHeadquartersCourtStats(
            makeAdmin(
                [{ court: 'كربلاء' }, { court: 'كربلاء' }],
                [{ court: 'كربلاء' }],
                null,
                null,
                { data: [], error: null },
            ),
        );
        expect(courts).toEqual([{ court: 'كربلاء', lawsuits: 2, transactions: 1 }]);
    });

    it('مهلة RPC تسقط إلى المسح الجدولي', async () => {
        vi.useFakeTimers();
        const admin = {
            rpc: () => new Promise(() => {}),
            from(table: string) {
                const rows = table === 'lawsuit_files' ? [{ court: 'بغداد' }] : [];
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    limit: async () => ({ data: rows, error: null }),
                                };
                            },
                        };
                    },
                };
            },
        } as unknown as SupabaseClient;
        try {
            const pending = listHeadquartersCourtStats(admin);
            await vi.advanceTimersByTimeAsync(HEADQUARTERS_STATS_RPC_BUDGET_MS);
            await expect(pending).resolves.toEqual([{ court: 'بغداد', lawsuits: 1, transactions: 0 }]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('خطأ جدول غير علاقة مفقودة لا يُسقط الإحصائيات', async () => {
        const courts = await listHeadquartersCourtStats(
            makeAdmin([], [], { message: 'permission denied for table lawsuit_files' }, {
                message: 'JWT expired',
            }),
        );
        expect(courts).toEqual([]);
    });

    it('مهلة المسح الجدولي تعيد قائمة فارغة لا خطأ', async () => {
        vi.useFakeTimers();
        const admin = {
            rpc: async () => ({
                data: null,
                error: { message: 'Could not find the function public.headquarters_court_counts' },
            }),
            from() {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    limit: () => new Promise(() => {}),
                                };
                            },
                        };
                    },
                };
            },
        } as unknown as SupabaseClient;
        try {
            const pending = listHeadquartersCourtStats(admin);
            await vi.advanceTimersByTimeAsync(
                HEADQUARTERS_STATS_RPC_BUDGET_MS + HEADQUARTERS_STATS_SCAN_BUDGET_MS,
            );
            await expect(pending).resolves.toEqual([]);
        } finally {
            vi.useRealTimers();
        }
    });
});
