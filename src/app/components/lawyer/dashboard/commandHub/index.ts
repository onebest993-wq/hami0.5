/** بلاطات مركز الأوامر — chunk خفيف للصفحة الرئيسية (بدون grid/layout-edit) */
export { ExecutionHero } from './ExecutionHero';
export { DockHalfTile } from './DockHalfTile';
export { ForumTile } from './ForumTile';
export { RouteTile } from './RouteTile';

if (import.meta.hot) {
    import.meta.hot.accept(() => {
        void import('@/app/runtime/commandHubTilesLoader').then((loader) => {
            loader.bumpCommandHubTilesGeneration();
        });
    });
}
