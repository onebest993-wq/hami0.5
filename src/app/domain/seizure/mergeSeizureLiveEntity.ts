import type { SeizureEntityBase } from './seizureWorkflowTypes';

/** يدمج صف المنقول/العقار من prop، القائمة، و read* السياق — مصدر واحد للواجهة */
export function mergeSeizureLiveEntity<T extends SeizureEntityBase>(
    prop: T,
    fromList: T | undefined,
    fromCtx: T | undefined,
): T {
    const base = fromList ? { ...prop, ...fromList } : prop;
    return fromCtx ? { ...base, ...fromCtx } : base;
}
