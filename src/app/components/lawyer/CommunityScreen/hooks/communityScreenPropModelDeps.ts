import type { CommunityScreenPropBuilderContext } from './communityScreenPropBuilderContext';

/** مدخلات ثبات سياق بناء الـ props — قيم الحقول دون تكرار أسمائها */
export function communityScreenPropModelMemoInputs(
    ctx: CommunityScreenPropBuilderContext,
): unknown[] {
    return Object.values(ctx);
}
