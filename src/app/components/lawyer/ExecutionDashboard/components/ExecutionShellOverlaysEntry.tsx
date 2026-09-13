import React, { Suspense } from 'react';
import { LazyExecutionDashboardShellOverlays } from '../executionDashboardShellOverlaysLazy';
import { ExecutionShellOverlayInstantPaint } from './ExecutionShellOverlayInstantPaint';

/**
 * برميل نوافذ الإضبارة — يُركَّب فقط عند نية نافذة.
 * انتظار البرميل هيكل فوري يعمل، لا فراغ كحلي.
 *
 * **وغلافُ `Suspense` دائمٌ لا يُقرَّر بالجاهزية في الرسم:** كان يُنزع عند أوّل إعادة رسمٍ بعد اكتمال
 * التحميل، فتُهدم كلُّ نافذةٍ مفتوحة — قِيس: مركزُ القرارات يُركَّب من جديد بعد ضغط «القرارات السابقة»
 * فيضيع الضغط. والبرميلُ المحمَّل يُرسم مباشرةً، فلا يعلّق ولا يظهر الهيكل.
 */
export function ExecutionShellOverlaysEntry({
    open,
    showUnifiedExecutionModal,
    unifiedModalTab,
    scope,
    followupSnapshot,
}: {
    open: boolean;
    showUnifiedExecutionModal: boolean;
    unifiedModalTab?: string | null;
    scope: Record<string, unknown>;
    followupSnapshot: Record<string, unknown>;
}): React.ReactElement | null {
    if (!open) return null;

    return (
        <Suspense fallback={<ExecutionShellOverlayInstantPaint scope={scope} />}>
            <LazyExecutionDashboardShellOverlays
                showUnifiedExecutionModal={showUnifiedExecutionModal}
                unifiedModalTab={unifiedModalTab ?? null}
                scope={scope}
                followupSnapshot={followupSnapshot}
            />
        </Suspense>
    );
}
