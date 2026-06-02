import type { ClusterScanRecord } from './types';
import {
    buildCriminalWorkspacePin,
    buildExecutionWorkspacePin,
    buildLawsuitWorkspacePin,
    buildNoteWorkspacePin,
    buildTaskWorkspacePin,
    buildThreadingWorkspacePin,
    buildTransactionWorkspacePin,
    buildUrgentWorkspacePin,
} from './workspacePinBuilders';
import { buildLinkedCaseLookup } from './resolveLinkedCaseMeta';

/** فهرس قراءة فقط للمسح العنقودي — لا يعدّل مصادر البيانات */
export function buildClusterScanIndex(input: {
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases: unknown[];
    urgentCases: unknown[];
    threadingTransactions?: unknown[];
    notes?: unknown[];
    fieldTasks?: unknown[];
}): ClusterScanRecord[] {
    const out: ClusterScanRecord[] = [];
    const seen = new Set<string>();

    // نبني الـ lookup مرة واحدة O(L + E) ثم نمررها للـ builders
    // → كل builder يعمل O(1) lookup بدل O(L + E) لكل استدعاء.
    // النتيجة: من O((T + E) × (L + E)) إلى O(T + E + L).
    const lookupIndex = buildLinkedCaseLookup(input.lawsuitFiles, input.executionFiles);

    const push = (pin: ReturnType<typeof buildLawsuitWorkspacePin>) => {
        if (!pin) return;
        const key = `${pin.type}:${pin.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
            id: pin.id,
            type: pin.type,
            title: pin.title,
            clientName: pin.clientName,
            caseNumber: pin.caseNumber,
            routePath: pin.routePath,
        });
    };

    for (const f of input.lawsuitFiles) {
        push(buildLawsuitWorkspacePin(f));
        push(buildTransactionWorkspacePin(f));
    }
    for (const f of input.executionFiles) push(buildExecutionWorkspacePin(f, input.lawsuitFiles, lookupIndex));
    for (const c of input.criminalCases) push(buildCriminalWorkspacePin(c));
    for (const c of input.urgentCases) push(buildUrgentWorkspacePin(c));
    for (const tx of input.threadingTransactions ?? []) push(buildThreadingWorkspacePin(tx));
    for (const n of input.notes ?? []) push(buildNoteWorkspacePin(n));
    for (const t of input.fieldTasks ?? []) {
        push(buildTaskWorkspacePin(t, input.lawsuitFiles, input.executionFiles, lookupIndex));
    }

    return out;
}
