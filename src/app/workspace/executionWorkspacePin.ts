import type { WorkspacePinnedItem } from './types';
import type { LinkedCaseLookupIndex } from './resolveLinkedCaseMeta';
import { extractExecutionCaseNumber, extractExecutionClientName } from './executionPinMeta';
import { recordFromParts, safeEntityId } from './workspacePinRecord';

/** تثبيت إضبارة تنفيذ — بلا برميل دعاوى/جزائي. */
export function buildExecutionWorkspacePin(
    file: unknown,
    lawsuitFiles: unknown[] = [],
    lookupIndex?: LinkedCaseLookupIndex,
): WorkspacePinnedItem | null {
    if (!file || typeof file !== 'object') return null;
    const f = file as Record<string, unknown>;
    const id = safeEntityId(f.id);
    if (!id) return null;
    const clientName = extractExecutionClientName(f);
    const caseForPin = extractExecutionCaseNumber(f, lawsuitFiles, lookupIndex);
    const title = caseForPin ? `تنفيذ — ${caseForPin}` : 'إضبارة تنفيذ';
    return recordFromParts('execution', id, title, clientName, caseForPin);
}
