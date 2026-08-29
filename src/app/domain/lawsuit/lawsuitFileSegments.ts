import type { FileData } from './lawsuitFileTypes';
import { emptyLawsuitLifecycleIndex, type LawsuitLifecycleIndex } from './lawsuitLifecycleIndex';

export type LawsuitFileSegments = {
    active: FileData[];
    archived: FileData[] | null;
    trash: FileData[] | null;
    index: LawsuitLifecycleIndex;
};

export function emptyLawsuitFileSegments(): LawsuitFileSegments {
    return { active: [], archived: null, trash: null, index: emptyLawsuitLifecycleIndex() };
}
