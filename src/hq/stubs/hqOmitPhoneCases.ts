/** بديل بناء المقر — مخزن قضايا المحامي المحلي ليس سطح المقر. */
export const useCaseStore = Object.assign(
    () => ({ cases: [] as unknown[], selectedCaseId: null as string | null }),
    {
        setState: () => undefined,
        getState: () => ({ cases: [], selectedCaseId: null }),
        persist: { setOptions: () => undefined },
    },
);
