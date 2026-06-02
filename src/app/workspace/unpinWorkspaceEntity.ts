import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import type { WorkspacePinType } from './types';

export function unpinWorkspaceItem(id: string | number, type: WorkspacePinType): void {
    useWorkspaceStore.getState().unpinItem(String(id), type);
}

/** إزالة تثبيت عند حذف/نقل إضبارة ملف (دعوى · معاملة · تنفيذ) */
export function unpinWorkspaceForDeletedFile(file: { id: string | number; type?: string }): void {
    const id = String(file.id);
    const t = file.type;
    if (t === 'transaction') {
        unpinWorkspaceItem(id, 'transaction');
        return;
    }
    if (t === 'execution') {
        unpinWorkspaceItem(id, 'execution');
        return;
    }
    if (t === 'lawsuit') {
        unpinWorkspaceItem(id, 'lawsuit');
        return;
    }
    unpinWorkspaceItem(id, 'lawsuit');
    unpinWorkspaceItem(id, 'transaction');
    unpinWorkspaceItem(id, 'execution');
}
