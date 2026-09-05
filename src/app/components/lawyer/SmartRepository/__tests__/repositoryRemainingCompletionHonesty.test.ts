import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('repository remaining completion honesty', () => {
    it('ربط الإضبارة يتراجع عن الإلحاق إن فشل الإخفاء أو الربط', () => {
        const dossier = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryComposeDossier.ts',
        );
        expect(dossier).toContain('linkingRef');
        expect(dossier).toContain('deleteLawsuitDossierNote');
        expect(dossier).toContain('deleteExecutionDossierNote');
        expect(dossier).toContain('appended.noteId');
        const sync = read('src/app/services/repository/repositoryDossierNoteSync.ts');
        expect(sync).toContain('stripRepositoryHtml');
        expect(sync).toContain('noteId: string');
        expect(sync).not.toContain(".replace(/<[^>]+>/g, ' ')");
    });

    it('حذف الغرفة لا يضيّع وثائق بلا جلسة ويستعيد النقل عند الفشل', () => {
        const rooms = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryRoomActions.ts',
        );
        expect(rooms).toContain('removingRef');
        expect(rooms).toContain("if (!uid)");
        expect(rooms).toContain("SmartToast.error('يرجى تسجيل الدخول أولاً')");
        expect(rooms).not.toContain('affectedDocs.length > 0 && !uid');
        expect(rooms).toContain('if (!roomsApi.deleteRoom(roomId))');
        expect(rooms).toContain('restoreGlobalNotesRoom');
        expect(rooms).toContain('restoreVaultDocsRoom');
        expect(rooms).toContain('repositoryRoomRelocate');
        const roomsHook = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryRooms.ts',
        );
        expect(roomsHook).toContain('(roomId: string): boolean');
        expect(roomsHook).toContain('if (!uid) return false');
    });

    it('Escape لا يُسقط حفظاً جارياً وتركيز البطاقات يشمل المخزن والإضبارة', () => {
        const escape = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryEscapeStack.ts',
        );
        expect(escape).toContain('composeSaving');
        expect(escape).toContain('if (pendingUploadOpen)');
        expect(escape).toContain('if (!composeSaving) onResetComposer()');
        const model = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryUnifiedFeedModel.ts',
        );
        expect(model).toContain('composeSaving: compose.saving');
        const vault = read(
            'src/app/components/lawyer/SmartRepository/entryCards/VaultEntryCard.tsx',
        );
        expect(vault).toContain('data-note-id={doc.id}');
        const dossierCard = read(
            'src/app/components/lawyer/SmartRepository/entryCards/DossierEntryCard.tsx',
        );
        expect(dossierCard).toContain('data-note-id={item.ref.id}');
        const focus = read('src/app/components/lawyer/SmartRepository/repositoryFeedFocus.ts');
        expect(focus).toContain('djb2Hash');
        const feed = read(
            'src/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed.tsx',
        );
        expect(feed).toContain('if (!compose.saving) compose.resetComposer()');
        const compose = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryCompose.ts',
        );
        expect(compose).toContain('discardOrphanComposeAttachment');
        expect(compose).toContain('notePersisted');
        expect(compose).toContain("SmartToast.error('حُفظت المسودة وتعذّر إكمال التثبيت')");
    });

    it('مسار خلاصة واحد ومسار شريط محرّر واحد', () => {
        const dir = join(root, 'src/app/components/lawyer/SmartRepository');
        expect(existsSync(join(dir, 'RepositoryFeedProgressiveList.tsx'))).toBe(false);
        expect(existsSync(join(dir, 'repositoryFeedConstants.ts'))).toBe(false);
        const list = read('src/app/components/lawyer/SmartRepository/RepositoryFeedList.tsx');
        expect(list).toContain('RepositoryFeedVirtualList');
        expect(list).not.toContain('RepositoryFeedProgressiveList');
        expect(list).not.toContain('shouldVirtualizeRepositoryFeed');
        const panel = read('src/app/components/lawyer/SmartRepository/RepositoryFeedPanel.tsx');
        expect(panel).toContain('data-repository-virtualized="true"');
        expect(panel).not.toContain('layoutClass');
        const virtual = read(
            'src/app/components/lawyer/SmartRepository/RepositoryFeedVirtualList.tsx',
        );
        expect(virtual).toContain('first-paint-');
        expect(virtual).toContain('getRepositoryFeedContainerClass');
        const toolbar = read(
            'src/app/components/lawyer/SmartRepository/LegalRichTextEditorToolbar.tsx',
        );
        expect(toolbar).toContain('LegalRichTextEditorCompactToolbar');
        expect(toolbar).not.toContain('if (compact)');
        const editor = read('src/app/components/lawyer/SmartRepository/LegalRichTextEditor.tsx');
        expect(editor).not.toContain('compact={compact}');
        const layout = read(
            'src/app/components/lawyer/SmartRepository/RepositoryEntryContentLayout.tsx',
        );
        expect(layout).not.toContain('dangerouslySetInnerHTML');
        expect(layout).toContain('stripRepositoryHtml');
        const compose = read('src/app/components/lawyer/SmartRepository/hooks/useRepositoryCompose.ts');
        expect(compose).not.toContain("from '../legalRichTextEditorUtils'");
        expect(compose).toContain("import('../legalRichTextEditorUtils')");
        const modal = read('src/app/components/lawyer/SmartRepositoryModal.tsx');
        expect(modal).toContain("from './SmartRepository/SmartRepositoryUnifiedFeed'");
        expect(modal).not.toContain("import('./SmartRepository/SmartRepositoryUnifiedFeed')");
        expect(modal).not.toContain('RepositoryFeedBootFallback');
        const host = read('src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx');
        expect(host).not.toContain("import('./SmartRepositoryUnifiedFeed')");
        expect(host).toContain('scheduleIdleWork');
    });
});
