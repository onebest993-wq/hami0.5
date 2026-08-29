import type { CriminalCase } from './criminalStore';
import { isInternalCaseIdentifier } from './criminalCaseReferenceUtils';
import { resolveMergedCaseIds } from './criminalCaseMergeUtils';
import { areCasesSameProceduralStage } from './caseMergeTimeline';
import { fail } from './caseMergeMigrationTypes';

export function validateCaseMerge(
    parent: CriminalCase | undefined,
    child: CriminalCase | undefined,
    mergeReason: string,
    _casesById?: Record<string, CriminalCase | undefined>,
): asserts parent is CriminalCase {
    if (!parent) fail('missing_parent');
    if (!child) fail('missing_child');

    if (!parent.id || !child.id) fail('missing_child');
    if (isInternalCaseIdentifier(parent.id) && !parent.basics) fail('missing_parent');
    if (isInternalCaseIdentifier(child.id) && !child.basics) fail('missing_child');

    if (parent.id === child.id) fail('self_merge');

    if (parent.dossierStatus === 'merged' || String(parent.mergedIntoCaseId ?? '').trim()) {
        fail('parent_already_merged');
    }
    if (child.dossierStatus === 'merged' || String(child.mergedIntoCaseId ?? '').trim()) {
        fail('child_already_merged');
    }

    if (!areCasesSameProceduralStage(parent, child)) fail('cross_stage');

    if (resolveMergedCaseIds(parent).includes(child.id)) fail('already_merged_to_parent');

    if (!String(mergeReason ?? '').trim()) fail('empty_reason');
}

