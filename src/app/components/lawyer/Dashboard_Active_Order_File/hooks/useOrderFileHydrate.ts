export type { OrderFileHydrateSetters, UseOrderFileHydrateArgs } from './hydrate/types';

import type { UseOrderFileHydrateArgs } from './hydrate/types';
import { useFetchCaseHydrate } from './hydrate/useFetchCaseHydrate';
import { useDefenderEntryHydrate } from './hydrate/useDefenderEntryHydrate';

export function useOrderFileHydrate(args: UseOrderFileHydrateArgs) {
    useFetchCaseHydrate(args);
    useDefenderEntryHydrate(args);
}
