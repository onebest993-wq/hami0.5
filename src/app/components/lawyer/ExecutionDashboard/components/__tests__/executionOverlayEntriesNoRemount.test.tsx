// @vitest-environment jsdom
/**
 * نوافذُ الإضبارة: ما رُكّب بارداً لا يُعاد تركيبُه حين يكتمل تحميلُه ثمّ يُعاد الرسم.
 *
 * كلُّ موضعٍ هنا كان يُقرّر في **كلّ رسم**: `isPreloaded()` ⇒ المكوّنُ عارياً، وإلّا داخل
 * `Suspense`. فبعد التحميل، أوّلُ إعادة رسمٍ — ويكفيها `hami-decisions-reload` — تُبدّل نوعَ
 * العنصر، **فتُهدم النافذةُ المفتوحة بكلّ حالتها** بلا أيّ setter. والتوكيدُ هو عرَضُ المحامي
 * نفسُه: التبويبُ الذي اختاره يعود إلى الأوّل.
 */
import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

type Mod = { default: React.ComponentType<Record<string, unknown>> };

const probe = vi.hoisted(() => {
    const make = () => {
        let resolve: (m: unknown) => void = () => undefined;
        const promise = new Promise<unknown>((r) => {
            resolve = r;
        });
        return { promise, resolve: (m: unknown) => resolve(m) };
    };
    return {
        shell: make(),
        dossier: make(),
        followup: make(),
        portal: make(),
        metaEdit: make(),
        mounts: {} as Record<string, number>,
    };
});

vi.mock('../../executionDashboardShellOverlaysLazy', async () => {
    const { createPreloadableLazyComponent } = await import('@/app/utils/lazy/preloadableLazy');
    return {
        LazyExecutionDashboardShellOverlays: createPreloadableLazyComponent(
            () => probe.shell.promise as Promise<Mod>,
        ),
    };
});

vi.mock('@/app/components/lawyer/dashboard/executionDashboardPortalLazy', async () => {
    const { createPreloadableLazyComponent } = await import('@/app/utils/lazy/preloadableLazy');
    return {
        LazyExecutionDashboardPortal: createPreloadableLazyComponent(() => probe.dossier.promise as Promise<Mod>),
    };
});

vi.mock('@/app/components/lawyer/dashboard/ExecutionDossierInstantPaintCover', () => ({
    ExecutionDossierInstantPaintCover: () => <div data-testid="fallback-dossier" />,
}));

vi.mock('../../executionFollowupHostLazy', async () => {
    const { createPreloadableLazyComponent } = await import('@/app/utils/lazy/preloadableLazy');
    return {
        LazyExecutionFollowupModalHost: createPreloadableLazyComponent(() => probe.followup.promise as Promise<Mod>),
    };
});

vi.mock('../../executionFollowupModalLazy', async () => {
    const { createPreloadableLazyComponent } = await import('@/app/utils/lazy/preloadableLazy');
    return {
        LazyExecutionFollowupModalPortal: createPreloadableLazyComponent(() => probe.portal.promise as Promise<Mod>),
    };
});

vi.mock('../../executionFollowupTabPrefetch', () => ({
    prefetchExecutionFollowupTab: () => undefined,
}));

vi.mock('../ExecutionFollowupInstantFrame', () => ({
    ExecutionFollowupInstantFrame: () => <div data-testid="fallback-followup" />,
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryOverlays', async () => {
    const { createPreloadableLazyComponent } = await import('@/app/utils/lazy/preloadableLazy');
    const Closed = () => null;
    return {
        LazyDossierMetaEditSection: createPreloadableLazyComponent(() => probe.metaEdit.promise as Promise<Mod>),
        LazyExecutionHeirsQuickViewModal: Closed,
        LazyExecutionTrashModal: Closed,
        LazyPartyEditModal: Closed,
        LazyPermanentDeleteConfirmDialog: Closed,
        LazyTimelineEditModal: Closed,
    };
});

vi.mock('../executionOverlayInstantPresets', () => ({
    ExecutionNamedOverlayInstantFrame: () => <div data-testid="fallback-edit" />,
}));

import { ExecutionShellOverlaysEntry } from '../ExecutionShellOverlaysEntry';
import { ExecutionFollowupOverlayEntry } from '../ExecutionFollowupOverlayEntry';
import { ExecutionFollowupModalHost } from '../ExecutionFollowupModalHost';
import { ExecutionDashboardEditOverlays } from '../ExecutionDashboardEditOverlays';
import { LawyerDashboardExecutionDossierOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry';

function makeStateful(name: string) {
    return function Stateful() {
        const [tab, setTab] = useState('current');
        useEffect(() => {
            probe.mounts[name] = (probe.mounts[name] ?? 0) + 1;
        }, []);
        return (
            <button
                type="button"
                data-testid={`stateful-${name}`}
                data-tab={tab}
                onClick={() => setTab('previous')}
            >
                {name}
            </button>
        );
    };
}

async function coldLoadThenRerender(
    name: string,
    deferred: { promise: Promise<unknown>; resolve: (m: unknown) => void },
    view: (n: number) => React.ReactElement,
) {
    const { rerender } = render(view(1));
    await act(async () => {
        deferred.resolve({ default: makeStateful(name) });
        await deferred.promise;
    });
    fireEvent.click(await screen.findByTestId(`stateful-${name}`));
    expect(screen.getByTestId(`stateful-${name}`).dataset.tab).toBe('previous');

    rerender(view(2));
    expect(screen.getByTestId(`stateful-${name}`).dataset.tab).toBe('previous');
    expect(probe.mounts[name]).toBe(1);
}

function editOverlaysProps(n: number) {
    return {
        showExecutionTrashModal: false,
        trashedTimelineEvents: [],
        trashedCaseNotes: [],
        trashedCaseTasks: [],
        setShowExecutionTrashModal: vi.fn(),
        restoreTimelineEventFromTrash: vi.fn(),
        setPermanentDeleteTimelineId: vi.fn(),
        restoreCaseNoteFromTrash: vi.fn(),
        permanentlyDeleteCaseNote: vi.fn(),
        restoreCaseTaskFromTrash: vi.fn(),
        permanentlyDeleteCaseTask: vi.fn(),
        timelineEditDraft: null,
        setTimelineEditDraft: vi.fn(),
        saveTimelineEditDraft: vi.fn(),
        moveTimelineEventToTrash: vi.fn(),
        showEditDossierMetaModal: true,
        dossierMetaDraft: { n },
        isEvictionExecutionModule: false,
        setShowEditDossierMetaModal: vi.fn(),
        setDossierMetaDraft: vi.fn(),
        saveDossierMetaDraft: vi.fn(),
        editPartyTarget: null,
        setEditPartyTarget: vi.fn(),
        partyEditDraft: {},
        setPartyEditDraft: vi.fn(),
        partyEditHeirDeleteConfirmIdx: null,
        setPartyEditHeirDeleteConfirmIdx: vi.fn(),
        savePartyEditDraft: vi.fn(),
        togglePartyEditHeirClient: vi.fn(),
        removeHeirFromPartyEditDraftAtIndex: vi.fn(),
        decisionsStorageExecutionId: 'ex-1',
        heirsQuickView: null,
        setHeirsQuickView: vi.fn(),
        X: () => null,
        permanentDeleteTimelineId: null,
        permanentlyDeleteTimelineEvent: vi.fn(),
    };
}

describe('نوافذُ الإضبارة — لا إعادةَ تركيبٍ بعد اكتمال التحميل', () => {
    it('برميلُ النوافذ (ExecutionShellOverlaysEntry)', async () => {
        await coldLoadThenRerender('shell', probe.shell, (n) => (
            <ExecutionShellOverlaysEntry
                open
                showUnifiedExecutionModal={false}
                scope={{ n }}
                followupSnapshot={{}}
            />
        ));
    });

    it('الإضبارةُ نفسها (LawyerDashboardExecutionDossierOverlayEntry)', async () => {
        const dossier = { setActiveFile: vi.fn(), handleUpdateExecutionFile: vi.fn() };
        const archive = { setArchiveType: vi.fn() };
        await coldLoadThenRerender('dossier', probe.dossier, (n) => (
            <LawyerDashboardExecutionDossierOverlayEntry
                dossier={dossier as never}
                archive={archive as never}
                file={{ id: `f-${n}` } as never}
                open
            />
        ));
    });

    it('محضرُ المتابعة (ExecutionFollowupOverlayEntry)', async () => {
        await coldLoadThenRerender('followup', probe.followup, (n) => (
            <ExecutionFollowupOverlayEntry open snapshot={{ n } as never} />
        ));
    });

    it('لوحةُ المحضر داخل مضيفه (ExecutionFollowupModalHost)', async () => {
        await coldLoadThenRerender('portal', probe.portal, (n) => (
            <ExecutionFollowupModalHost open snapshot={{ decisionsStorageExecutionId: 'ex-1', n } as never} />
        ));
    });

    it('نموذجُ تعديل بيانات الإضبارة (ExecutionDashboardEditOverlays)', async () => {
        await coldLoadThenRerender('metaEdit', probe.metaEdit, (n) => (
            <ExecutionDashboardEditOverlays {...(editOverlaysProps(n) as never)} />
        ));
    });
});
