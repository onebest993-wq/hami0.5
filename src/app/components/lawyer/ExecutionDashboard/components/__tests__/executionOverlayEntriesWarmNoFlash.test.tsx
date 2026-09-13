// @vitest-environment jsdom
/**
 * نافذةٌ سُخِّنت وحدتُها بـ`preload()` ثمّ فُتحت: **لا يظهر غطاؤها ولو إطاراً واحداً.**
 *
 * ذلك كان غرضَ التفرّع `isPreloaded() ? <X/> : <Suspense><X/></Suspense>` الذي هدم النافذةَ المفتوحة؛ فصار
 * الغلافُ دائماً، **وبقي الغرضُ محروساً هنا سلوكياً:** المحمَّلُ يُرسم داخل `Suspense` في أوّل commit.
 *
 * **ولماذا ملفٌّ وحده، وتسخينٌ بـ`preload()` لا برسم:** `React.lazy` يحفظ وحدتَه بعد أوّل رسمٍ علّق فيه، فمكوّنٌ
 * رُسم قبلُ في الملفّ نفسه يُرسم بعدها متزامناً بلا تعليق — **فيمرّ الاختبارُ ولو رسم
 * `createPreloadableLazyComponent` المحمَّلَ عبر `React.lazy`**. قِيس: كُتبت هذه التوكيدات أوّلاً بعد اختبارات
 * إعادة التركيب في ملفّها، فمرّت على ذلك التخريب بعينه. والتطبيقُ يُسخّن بـ`preload()` ولا يرسم، وكذلك هنا.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import { PreloadableOverlayGate } from '@/app/utils/lazy/preloadableOverlayGate';

type Mod = { default: React.ComponentType<Record<string, unknown>> };

vi.mock('../../executionDashboardShellOverlaysLazy', async () => {
    const { createPreloadableLazyComponent: create } = await import('@/app/utils/lazy/preloadableLazy');
    return {
        LazyExecutionDashboardShellOverlays: create(
            async (): Promise<Mod> => ({ default: () => <div data-testid="content-shell" /> }),
        ),
    };
});

vi.mock('../ExecutionShellOverlayInstantPaint', () => ({
    ExecutionShellOverlayInstantPaint: () => <div data-testid="fallback-shell" />,
}));

vi.mock('@/app/components/lawyer/dashboard/executionDashboardPortalLazy', async () => {
    const { createPreloadableLazyComponent: create } = await import('@/app/utils/lazy/preloadableLazy');
    return {
        LazyExecutionDashboardPortal: create(
            async (): Promise<Mod> => ({ default: () => <div data-testid="content-dossier" /> }),
        ),
    };
});

vi.mock('@/app/components/lawyer/dashboard/ExecutionDossierInstantPaintCover', () => ({
    ExecutionDossierInstantPaintCover: () => <div data-testid="fallback-dossier" />,
}));

vi.mock('../../executionFollowupHostLazy', async () => {
    const { createPreloadableLazyComponent: create } = await import('@/app/utils/lazy/preloadableLazy');
    return {
        LazyExecutionFollowupModalHost: create(
            async (): Promise<Mod> => ({ default: () => <div data-testid="content-followup" /> }),
        ),
    };
});

vi.mock('../../executionFollowupModalLazy', async () => {
    const { createPreloadableLazyComponent: create } = await import('@/app/utils/lazy/preloadableLazy');
    return {
        LazyExecutionFollowupModalPortal: create(
            async (): Promise<Mod> => ({ default: () => <div data-testid="content-portal" /> }),
        ),
    };
});

vi.mock('../../executionFollowupTabPrefetch', () => ({
    prefetchExecutionFollowupTab: () => undefined,
}));

vi.mock('../ExecutionFollowupInstantFrame', () => ({
    ExecutionFollowupInstantFrame: () => <div data-testid="fallback-followup" />,
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryOverlays', async () => {
    const { createPreloadableLazyComponent: create } = await import('@/app/utils/lazy/preloadableLazy');
    const Closed = () => null;
    return {
        LazyDossierMetaEditSection: create(
            async (): Promise<Mod> => ({ default: () => <div data-testid="content-meta-edit" /> }),
        ),
        LazyExecutionHeirsQuickViewModal: Closed,
        LazyExecutionTrashModal: Closed,
        LazyPartyEditModal: Closed,
        LazyPermanentDeleteConfirmDialog: Closed,
        LazyTimelineEditModal: Closed,
    };
});

vi.mock('../executionOverlayInstantPresets', () => ({
    ExecutionNamedOverlayInstantFrame: () => <div data-testid="fallback-meta-edit" />,
}));

import { LazyExecutionDashboardShellOverlays } from '../../executionDashboardShellOverlaysLazy';
import { LazyExecutionDashboardPortal } from '@/app/components/lawyer/dashboard/executionDashboardPortalLazy';
import { LazyExecutionFollowupModalHost } from '../../executionFollowupHostLazy';
import { LazyExecutionFollowupModalPortal } from '../../executionFollowupModalLazy';
import { LazyDossierMetaEditSection } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryOverlays';
import { ExecutionShellOverlaysEntry } from '../ExecutionShellOverlaysEntry';
import { ExecutionFollowupOverlayEntry } from '../ExecutionFollowupOverlayEntry';
import { ExecutionFollowupModalHost } from '../ExecutionFollowupModalHost';
import { ExecutionDashboardEditOverlays } from '../ExecutionDashboardEditOverlays';
import { LawyerDashboardExecutionDossierOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry';

async function warm(lazy: { preload: () => Promise<void>; isPreloaded: () => boolean }) {
    await act(async () => {
        await lazy.preload();
    });
    expect(lazy.isPreloaded()).toBe(true);
}

/** التوكيدُ متزامنٌ بعد `render` عمداً: غطاءٌ ظهر ثمّ زال في مهمّةٍ لاحقة يُمسَك هنا، ولا يُمسَك بـ`findBy`. */
function expectFirstCommit(content: string, fallback: string) {
    expect(screen.queryByTestId(fallback)).toBeNull();
    expect(screen.getByTestId(content)).toBeTruthy();
}

describe('المُسخَّنُ بـpreload يُرسم في أوّل commit — والغلافُ دائم', () => {
    it('ضابطة: وحدةٌ لم تُسخَّن يظهر غطاؤها أوّلاً — فالتوكيدُ المتزامن يرى الغطاءَ حين يقع', async () => {
        const Cold = createPreloadableLazyComponent(
            async (): Promise<Mod> => ({ default: () => <div data-testid="content-cold" /> }),
        );
        render(
            <PreloadableOverlayGate lazy={Cold} lazyProps={{}} fallback={<div data-testid="fallback-cold" />} />,
        );
        expect(screen.getByTestId('fallback-cold')).toBeTruthy();
        expect(screen.queryByTestId('content-cold')).toBeNull();
        expect(await screen.findByTestId('content-cold')).toBeTruthy();
    });

    it('البوّابةُ العامّة (PreloadableOverlayGate)', async () => {
        const Warm = createPreloadableLazyComponent(
            async (): Promise<Mod> => ({ default: () => <div data-testid="content-gate" /> }),
        );
        await warm(Warm);
        render(<PreloadableOverlayGate lazy={Warm} lazyProps={{}} fallback={<div data-testid="fallback-gate" />} />);
        expectFirstCommit('content-gate', 'fallback-gate');
    });

    it('برميلُ النوافذ (ExecutionShellOverlaysEntry)', async () => {
        await warm(LazyExecutionDashboardShellOverlays);
        render(<ExecutionShellOverlaysEntry open showUnifiedExecutionModal={false} scope={{}} followupSnapshot={{}} />);
        expectFirstCommit('content-shell', 'fallback-shell');
    });

    it('الإضبارةُ نفسها (LawyerDashboardExecutionDossierOverlayEntry)', async () => {
        await warm(LazyExecutionDashboardPortal);
        render(
            <LawyerDashboardExecutionDossierOverlayEntry
                dossier={{ setActiveFile: vi.fn(), handleUpdateExecutionFile: vi.fn() } as never}
                archive={{ setArchiveType: vi.fn() } as never}
                file={{ id: 'warm' } as never}
                open
            />,
        );
        expectFirstCommit('content-dossier', 'fallback-dossier');
    });

    it('محضرُ المتابعة (ExecutionFollowupOverlayEntry)', async () => {
        await warm(LazyExecutionFollowupModalHost);
        render(<ExecutionFollowupOverlayEntry open snapshot={{ warm: true } as never} />);
        expectFirstCommit('content-followup', 'fallback-followup');
    });

    it('لوحةُ المحضر داخل مضيفه (ExecutionFollowupModalHost)', async () => {
        await warm(LazyExecutionFollowupModalPortal);
        render(<ExecutionFollowupModalHost open snapshot={{ decisionsStorageExecutionId: 'ex-warm' } as never} />);
        expectFirstCommit('content-portal', 'fallback-followup');
    });

    it('نموذجُ تعديل بيانات الإضبارة (ExecutionDashboardEditOverlays)', async () => {
        await warm(LazyDossierMetaEditSection);
        render(
            <ExecutionDashboardEditOverlays
                {...({
                    showEditDossierMetaModal: true,
                    dossierMetaDraft: {},
                    isEvictionExecutionModule: false,
                    setShowEditDossierMetaModal: vi.fn(),
                    setDossierMetaDraft: vi.fn(),
                    saveDossierMetaDraft: vi.fn(),
                } as never)}
            />,
        );
        expectFirstCommit('content-meta-edit', 'fallback-meta-edit');
    });
});
