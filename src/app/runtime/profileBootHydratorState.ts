/** حالة مشتركة بلا استيرادات — يتجنّب TDZ عند الاستيراد الدائري */
export const profileBootHydratorState = {
    bootHydratorArmed: false,
    hydrateInflight: null as Promise<boolean> | null,
    coldBootPrefetchStarted: false,
};
