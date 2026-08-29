/** بديل بناء المقر — مخزن الجزاء ليس سطح المقر. */
export const useCriminalStore = Object.assign(
    () => null,
    {
        setState: () => undefined,
        getState: () => ({ resetDraft: () => undefined }),
        persist: { setOptions: () => undefined },
    },
);
