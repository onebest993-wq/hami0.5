import type { WorkspacePinnedItem } from './types';
import { effectiveCaseNumber } from './extractCaseRefs';
import { sanitizePinCaseNumber } from './pinDisplayUtils';
import { partyName, recordFromParts, safeEntityId, safeStr } from './workspacePinRecord';

/** تثبيت دعوى مدنية — بلا مسار تنفيذ/مهام حتى تبقى شبكة المخزن خفيفة. */
export function buildLawsuitWorkspacePin(file: unknown): WorkspacePinnedItem | null {
    if (!file || typeof file !== 'object') return null;
    const f = file as Record<string, unknown>;
    const fileType = safeStr(f.type);
    if (fileType && fileType !== 'lawsuit') return null;
    const id = safeEntityId(f.id);
    if (!id) return null;
    const parties = Array.isArray(f.parties) ? f.parties : [];
    const clientParty = parties.find(
        (p) => p && typeof p === 'object' && (p as Record<string, unknown>).isClient,
    );
    let clientName =
        clientParty && typeof clientParty === 'object'
            ? safeStr((clientParty as Record<string, unknown>).name)
            : '';
    if (!clientName && parties.length > 0) {
        clientName = partyName(parties[0]);
    }
    const docType = safeStr(f.docType);
    const caseNumber = sanitizePinCaseNumber(
        effectiveCaseNumber(
            safeStr(f.caseNo) || safeStr(f.caseNumber) || safeStr(f.fileNumber),
            safeStr(f.title),
            docType,
        ),
        safeStr(f.title),
        docType,
    );
    const title = caseNumber ? `دعوى — ${caseNumber}` : docType || 'دعوى مدنية';
    return recordFromParts('lawsuit', id, title, clientName, caseNumber);
}
