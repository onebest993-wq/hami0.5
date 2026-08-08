import {
    resolveDecisionsStorageExecutionId,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';

export type DecisionsStorageIdContext = {
    decisionsStorageExecutionId?: string | null;
    executionId?: string | null;
    executionDataId?: string | null;
    executionData?: Record<string, unknown> | null;
};

/**
 * معرّف تخزين القرارات الموحّد على حدود الإضبارة.
 * يُفضّل `decisionsStorageExecutionId` من boot pipeline ثم يحلّ عبر resolveDecisionsStorageExecutionId.
 */
export function requireDecisionsStorageExecutionId(ctx: DecisionsStorageIdContext): string {
    const preset = String(ctx.decisionsStorageExecutionId ?? '').trim();
    if (preset && preset !== 'default') return preset;
    const seed = String(ctx.executionId ?? ctx.executionDataId ?? '').trim();
    return resolveDecisionsStorageExecutionId(seed || undefined, ctx.executionData ?? null);
}

/** يُرجع undefined عند غياب معرّف صالح (default) — للـ props الاختيارية */
export function coalesceDecisionsStorageExecutionId(ctx: DecisionsStorageIdContext): string | undefined {
    const id = requireDecisionsStorageExecutionId(ctx);
    return id === 'default' ? undefined : id;
}
