export const EXECUTION_ARCHIVE_TRASH_DIALOGS_LAYER_TEST_ID =
    'execution-archive-trash-dialogs-layer';

export function hasExecutionArchiveTrashDialogsLayer(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(
        document.querySelector(`[data-testid="${EXECUTION_ARCHIVE_TRASH_DIALOGS_LAYER_TEST_ID}"]`),
    );
}
