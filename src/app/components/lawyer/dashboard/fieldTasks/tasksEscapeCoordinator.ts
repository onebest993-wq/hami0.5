/**
 * Escape Stack 4 طبقات لقسم المهام:
 * L0 (0): Surface — LawyerDashboardFeatureSurface (feature-level dismiss)
 * L1 (1): Sheet   — FieldTasks BottomSheet / Curtain
 * L2 (2): Help   — Tasks Manager Help Inbox / Help Modal
 * L3 (3): Plan   — Nested Plan / SubTasks Nested Modal (أعلى أولوية)
 *
 * يطبّق نمط Escape Stack: أعلى طبقة مفعلة تسريبات الباقي
 * = أولوية إغلاق من فوق لأسفل (Top-first pop). الحالية (top-first pop).
 * الحفاظ على التوافق مع الاستدعاءات القديمة باستخدام key mapping تلقائي.
 */
type EscapeLayer = 'L0-surface' | 'L1-sheet' | 'L2-help' | 'L3-plan';

const ESCAPE_LAYER_PRIORITY: Record<EscapeLayer, number> = {
    'L0-surface': 0,
    'L1-sheet': 1,
    'L2-help': 2,
    'L3-plan': 3,
};

const activeLayerKeys = new Map<string, EscapeLayer>();

function classifyKey(key: string): EscapeLayer {
    const k = key.toLowerCase();
    if (k.includes('plan') || k.includes('nested') || k.includes('modal')) return 'L3-plan';
    if (k.includes('help') || k.includes('inbox')) return 'L2-help';
    if (k.includes('sheet') || k.includes('curtain') || k.includes('field') || k.includes('overlay')) return 'L1-sheet';
    return 'L0-surface';
}

export function blockTasksOverlayEscape(key: string): void {
    activeLayerKeys.set(key, classifyKey(key));
}

export function unblockTasksOverlayEscape(key: string): void {
    activeLayerKeys.delete(key);
}

export function isTasksOverlayEscapeBlocked(): boolean {
    return activeLayerKeys.size > 0;
}

export function unblockAllTasksOverlayEscape(): void {
    activeLayerKeys.clear();
}

/** للاختبارات */
export function resetTasksOverlayEscapeForTests(): void {
    activeLayerKeys.clear();
}
