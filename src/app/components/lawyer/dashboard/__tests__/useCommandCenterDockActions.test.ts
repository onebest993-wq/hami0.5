import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandCenterDockActions } from '../useCommandCenterDockActions';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
    },
}));

describe('useCommandCenterDockActions — المفكرة السريعة', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('يرفض حفظ ملاحظة بدون تسجيل دخول', () => {
        const onAddNote = vi.fn();
        const { result } = renderHook(() => useCommandCenterDockActions({ onAddNote }));

        act(() => {
            result.current.saveQuickNote('ملاحظة مهمة');
        });

        expect(onAddNote).not.toHaveBeenCalled();
    });

    it('يحفظ ملاحظة نصية للمستخدم المسجّل', () => {
        const onAddNote = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ userId: 'lawyer-1', onAddNote }),
        );

        act(() => {
            result.current.saveQuickNote('ملاحظة عن العقد');
        });

        expect(onAddNote).toHaveBeenCalledTimes(1);
        expect(onAddNote.mock.calls[0]![0].type).toBe('text');
        expect(onAddNote.mock.calls[0]![0].content).toBe('ملاحظة عن العقد');
    });

    it('يصنّف موعداً عند كلمات الجدولة', () => {
        const onAddNote = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ userId: 'lawyer-1', onAddNote }),
        );

        act(() => {
            result.current.saveQuickNote('موعد جلسة غداً');
        });

        expect(onAddNote.mock.calls[0]![0].type).toBe('schedule');
    });

    it('يحفظ التسجيل الصوتي في المفكرة', async () => {
        const onAddNote = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ userId: 'lawyer-1', onAddNote }),
        );

        await act(async () => {
            await result.current.saveVoiceNote({
                blob: new Blob(['audio'], { type: 'audio/webm' }),
                durationSeconds: 12,
                transcript: 'ملاحظة صوتية',
            });
        });

        expect(onAddNote).toHaveBeenCalledTimes(1);
        expect(onAddNote.mock.calls[0]![0].type).toBe('voice');
        expect(onAddNote.mock.calls[0]![0].transcript).toBe('ملاحظة صوتية');
        expect(onAddNote.mock.calls[0]![0].content).toContain('hami-voice-ref:');
        expect(result.current.showVoiceModal).toBe(false);
    });

    it('يرفض فتح المفكرة بدون تسجيل دخول', () => {
        const onOpenFullNotepad = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ onOpenFullNotepad }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('dockNotepad', false)?.();
        });

        expect(onOpenFullNotepad).not.toHaveBeenCalled();
    });
});

describe('useCommandCenterDockActions — المخزن الذكي', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض فتح المخزن بدون تسجيل دخول', () => {
        const { result } = renderHook(() => useCommandCenterDockActions({}));

        act(() => {
            result.current.resolveDockWidgetClick('dockVault', false)?.();
        });

        expect(result.current.showVault).toBe(false);
    });

    it('يفتح المخزن للمستخدم المسجّل', async () => {
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ userId: 'lawyer-1' }),
        );

        await act(async () => {
            result.current.resolveDockWidgetClick('dockVault', false)?.();
        });

        expect(result.current.showVault).toBe(true);
    });
});

describe('useCommandCenterDockActions — مهام اليوم', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض فتح المهام بدون تسجيل دخول', () => {
        const onOpenFieldTasksSheet = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ onOpenFieldTasksSheet }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('dockTasks', false)?.();
        });

        expect(onOpenFieldTasksSheet).not.toHaveBeenCalled();
    });

    it('يفتح ستارة المهام للمستخدم المسجّل', async () => {
        const onOpenFieldTasksSheet = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ userId: 'lawyer-1', onOpenFieldTasksSheet }),
        );

        await act(async () => {
            result.current.resolveDockWidgetClick('dockTasks', false)?.();
        });

        expect(onOpenFieldTasksSheet).toHaveBeenCalledTimes(1);
    });
});

describe('useCommandCenterDockActions — التقويم', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض فتح التقويم بدون تسجيل دخول', () => {
        const onOpenCalendar = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ onOpenCalendar, urgentAlertsCount: 2, secretaryAlerts: [{ id: 'a' } as never] }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('dockCalendar', false)?.();
        });

        expect(onOpenCalendar).not.toHaveBeenCalled();
        expect(result.current.hubDockSheet).toBeNull();
    });

    it('يفتح التقويم حتى مع وجود تنبيهات عاجلة', async () => {
        const onOpenCalendar = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({
                userId: 'lawyer-1',
                onOpenCalendar,
                urgentAlertsCount: 3,
                secretaryAlerts: [{ id: 'alert-1' } as never],
            }),
        );

        await act(async () => {
            result.current.resolveDockWidgetClick('dockCalendar', false)?.();
        });

        expect(onOpenCalendar).toHaveBeenCalledTimes(1);
        expect(result.current.hubDockSheet).toBeNull();
    });
});

describe('useCommandCenterDockActions — المنتدى', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض فتح المنتدى بدون تسجيل دخول', () => {
        const onOpenCommunity = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ onOpenCommunity }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('forum', false)?.();
        });

        expect(onOpenCommunity).not.toHaveBeenCalled();
    });

    it('يرفض فتح المنتدى للضيف', () => {
        const onOpenCommunity = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({
                userId: 'guest-lawyer-1',
                onOpenCommunity,
            }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('forum', false)?.();
        });

        expect(onOpenCommunity).not.toHaveBeenCalled();
    });

    it('يفتح المنتدى للمستخدم المسجّل', async () => {
        const onOpenCommunity = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ userId: 'lawyer-1', onOpenCommunity }),
        );

        await act(async () => {
            result.current.resolveDockWidgetClick('forum', false)?.();
        });

        expect(onOpenCommunity).toHaveBeenCalledTimes(1);
    });
});

describe('useCommandCenterDockActions — التنبيهات', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض فتح التنبيهات بدون تسجيل دخول', () => {
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ pinnedCount: 2, urgentAlertsCount: 1 }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('alerts', false)?.();
        });

        expect(result.current.hubDockSheet).toBeNull();
    });

    it('يفتح لوحة التنبيهات للمستخدم المسجّل', () => {
        const { result } = renderHook(() =>
            useCommandCenterDockActions({
                userId: 'lawyer-1',
                pinnedCount: 0,
                urgentAlertsCount: 2,
            }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('alerts', false)?.();
        });

        expect(result.current.hubDockSheet).toBe('alerts');
    });

    it('يفتح التثبيت عند وجود pins فقط', () => {
        const { result } = renderHook(() =>
            useCommandCenterDockActions({
                userId: 'lawyer-1',
                pinnedCount: 3,
                urgentAlertsCount: 0,
            }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('alerts', false)?.();
        });

        expect(result.current.hubDockSheet).toBe('pins');
    });
});

describe('useCommandCenterDockActions — hub tiles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض فتح التنفيذ بدون تسجيل دخول', () => {
        const onOpenArchive = vi.fn();
        const { result } = renderHook(() => useCommandCenterDockActions({ onOpenArchive }));

        act(() => {
            result.current.resolveDockWidgetClick('hubExecution', false)?.();
        });

        expect(onOpenArchive).not.toHaveBeenCalled();
    });

    it('يفتح التنفيذ للمستخدم المسجّل', () => {
        const onOpenArchive = vi.fn();
        const onPrefetchExecution = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({
                userId: 'lawyer-1',
                onOpenArchive,
                onPrefetchExecution,
            }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('hubExecution', false)?.();
        });

        expect(onPrefetchExecution).toHaveBeenCalledTimes(1);
        expect(onOpenArchive).toHaveBeenCalledWith('execution');
    });

    it('يفتح الدعاوى للمستخدم المسجّل', () => {
        const onOpenArchive = vi.fn();
        const { result } = renderHook(() =>
            useCommandCenterDockActions({ userId: 'lawyer-1', onOpenArchive }),
        );

        act(() => {
            result.current.resolveDockWidgetClick('hubLawsuit', false)?.();
        });

        expect(onOpenArchive).toHaveBeenCalledWith('lawsuit');
    });
});

