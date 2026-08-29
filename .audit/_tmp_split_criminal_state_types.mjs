import fs from 'node:fs';
import path from 'node:path';

const root = 'src/app/components/lawyer/criminal-system';
const srcPath = path.join(root, 'criminalStoreState.types.ts');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const headerEnd = lines.findIndex((l) => l.startsWith('export type CriminalStoreState'));
const header = lines.slice(0, headerEnd).join('\n');

const slices = [
    {
        file: 'criminalStoreStateData.types.ts',
        start: 99,
        end: 107,
        banner: '/** Persisted store data fields — slice of CriminalStoreState */',
        extraImports: '',
    },
    {
        file: 'criminalStoreStateDraftSlice.types.ts',
        start: 108,
        end: 186,
        banner: '/** Draft & party session actions — slice of CriminalStoreState */',
    },
    {
        file: 'criminalStoreStateEvidenceSlice.types.ts',
        start: 187,
        end: 258,
        banner: '/** Evidence, timeline, investigation, procedural — slice of CriminalStoreState */',
    },
    {
        file: 'criminalStoreStateRequestTrialSlice.types.ts',
        start: 259,
        end: 346,
        banner: '/** Lawyer requests, trash, trials, verdict cards — slice of CriminalStoreState */',
    },
    {
        file: 'criminalStoreStateJudicialSlice.types.ts',
        start: 347,
        end: 466,
        banner: '/** Judicial lifecycle, party status, seized assets — slice of CriminalStoreState */',
    },
    {
        file: 'criminalStoreStateLifecycleSlice.types.ts',
        start: 467,
        end: 627,
        banner: '/** Referrals, case ops, severance, lifecycle — slice of CriminalStoreState */',
    },
];

for (const slice of slices) {
    const body = lines
        .slice(slice.start - 1, slice.end)
        .map((l) => l.replace(/^    /, ''))
        .join('\n');

    const exportName =
        slice.file === 'criminalStoreStateData.types.ts'
            ? 'CriminalStoreStateData'
            : slice.file.includes('Draft')
              ? 'CriminalStoreStateDraftActions'
              : slice.file.includes('Evidence')
                ? 'CriminalStoreStateEvidenceActions'
                : slice.file.includes('RequestTrial')
                  ? 'CriminalStoreStateRequestTrialActions'
                  : slice.file.includes('Judicial')
                    ? 'CriminalStoreStateJudicialActions'
                    : 'CriminalStoreStateLifecycleActions';

    const content = `${slice.banner}
${header}

export type ${exportName} = {
${body}
};
`;
    fs.writeFileSync(path.join(root, slice.file), content);
    console.log('wrote', slice.file, 'lines', content.split(/\n/).length);
}

const main = `/**
 * Criminal Zustand store state surface — composed from domain slices.
 */
import type { CriminalStoreStateData } from './criminalStoreStateData.types';
import type { CriminalStoreStateDraftActions } from './criminalStoreStateDraftSlice.types';
import type { CriminalStoreStateEvidenceActions } from './criminalStoreStateEvidenceSlice.types';
import type { CriminalStoreStateRequestTrialActions } from './criminalStoreStateRequestTrialSlice.types';
import type { CriminalStoreStateJudicialActions } from './criminalStoreStateJudicialSlice.types';
import type { CriminalStoreStateLifecycleActions } from './criminalStoreStateLifecycleSlice.types';

export type CriminalStoreState = CriminalStoreStateData &
    CriminalStoreStateDraftActions &
    CriminalStoreStateEvidenceActions &
    CriminalStoreStateRequestTrialActions &
    CriminalStoreStateJudicialActions &
    CriminalStoreStateLifecycleActions;
`;

fs.writeFileSync(srcPath, main);
console.log('rewrote criminalStoreState.types.ts');
