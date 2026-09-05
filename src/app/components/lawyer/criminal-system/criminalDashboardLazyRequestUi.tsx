import React, { lazy, Suspense, type ComponentProps, type ReactNode } from 'react';

const LazyRequestModalEntryLanes = lazy(() =>
    import('./components/RequestModalEntryLanes').then((m) => ({
        default: m.RequestModalEntryLanes,
    })),
);

const LazyConcernedPartyDecisionPicker = lazy(() =>
    import('./components/ConcernedPartyDecisionPicker').then((m) => ({
        default: m.ConcernedPartyDecisionPicker,
    })),
);

const LazyLawyerRequestAttachmentsEditor = lazy(() =>
    import('./components/LawyerRequestUxAddons').then((m) => ({
        default: m.LawyerRequestAttachmentsEditor,
    })),
);

const LazyLawyerRequestMarginsMiniTimeline = lazy(() =>
    import('./components/LawyerRequestUxAddons').then((m) => ({
        default: m.LawyerRequestMarginsMiniTimeline,
    })),
);

const LazyRequestMarginAddButton = lazy(() =>
    import('./components/LawyerRequestUxAddons').then((m) => ({
        default: m.RequestMarginAddButton,
    })),
);

const LazyRequestMarginPromptModal = lazy(() =>
    import('./components/LawyerRequestUxAddons').then((m) => ({
        default: m.RequestMarginPromptModal,
    })),
);

function RequestFormInstantSlots() {
    return (
        <div className="space-y-2 py-2" aria-busy="true" aria-hidden>
            <div className="min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.035]" />
            <div className="min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.035]" />
        </div>
    );
}

function RequestUiSuspense({
    children,
    fallback = <RequestFormInstantSlots />,
}: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    return <Suspense fallback={fallback}>{children}</Suspense>;
}

export type { SeizedAssetDraft } from './components/RequestModalEntryLanes';
export type { PartyBailDraft, PartyDetentionDraft } from './components/concernedPartyDecisionPickerDraft';
export { emptyPartyBailDraft, isPartyBailDraftValid } from './components/concernedPartyDecisionPickerDraft';

export function RequestModalEntryLanes(
    props: ComponentProps<typeof LazyRequestModalEntryLanes>,
) {
    return (
        <RequestUiSuspense>
            <LazyRequestModalEntryLanes {...props} />
        </RequestUiSuspense>
    );
}

export function ConcernedPartyDecisionPicker(
    props: ComponentProps<typeof LazyConcernedPartyDecisionPicker>,
) {
    return (
        <RequestUiSuspense>
            <LazyConcernedPartyDecisionPicker {...props} />
        </RequestUiSuspense>
    );
}

export function LawyerRequestAttachmentsEditor(
    props: ComponentProps<typeof LazyLawyerRequestAttachmentsEditor>,
) {
    return (
        <RequestUiSuspense>
            <LazyLawyerRequestAttachmentsEditor {...props} />
        </RequestUiSuspense>
    );
}

export function LawyerRequestMarginsMiniTimeline(
    props: ComponentProps<typeof LazyLawyerRequestMarginsMiniTimeline>,
) {
    return (
        <RequestUiSuspense>
            <LazyLawyerRequestMarginsMiniTimeline {...props} />
        </RequestUiSuspense>
    );
}

export function RequestMarginAddButton(props: ComponentProps<typeof LazyRequestMarginAddButton>) {
    return (
        <RequestUiSuspense fallback={null}>
            <LazyRequestMarginAddButton {...props} />
        </RequestUiSuspense>
    );
}

export function RequestMarginPromptModal(props: ComponentProps<typeof LazyRequestMarginPromptModal>) {
    return (
        <RequestUiSuspense fallback={null}>
            <LazyRequestMarginPromptModal {...props} />
        </RequestUiSuspense>
    );
}

/** خفيف — يبقى في الـ shell؛ لا يُحمَّل مع نماذج الطلب الثقيلة */
export { RequestStarToggle } from './components/LawyerRequestUxAddons';
