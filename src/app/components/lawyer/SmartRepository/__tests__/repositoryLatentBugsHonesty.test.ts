import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const repo = join(root, 'src/app/components/lawyer/SmartRepository');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('repository latent bugs honesty', () => {
    it('تركيز البحث يُستهلك مرة ولا يُعاد مع كل تغيّر للخلاصة', () => {
        const feed = read('src/app/components/lawyer/SmartRepository/hooks/useRepositoryFeed.ts');
        expect(feed).not.toContain('querySelector(`[data-note-id="${focusNoteId}"]`)');
        expect(feed).not.toContain('focusNoteId');
        expect(existsSync(join(repo, 'RepositoryFeedProgressiveList.tsx'))).toBe(false);
        const virtual = readFileSync(join(repo, 'RepositoryFeedVirtualList.tsx'), 'utf8');
        const list = readFileSync(join(repo, 'RepositoryFeedList.tsx'), 'utf8');
        expect(list).toContain('RepositoryFeedVirtualList');
        expect(list).not.toContain('RepositoryFeedProgressiveList');
        expect(list).not.toContain('shouldVirtualizeRepositoryFeed');
        expect(virtual).toContain('consumeRepositoryFeedFocus');
        expect(virtual).toContain('scrollToIndex');
        expect(virtual).toContain('scheduleRepositoryFeedCardScroll');
        const unified = read('src/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed.tsx');
        expect(unified).toContain('focusNoteId={focusNoteId}');
        const panel = readFileSync(join(repo, 'RepositoryFeedPanel.tsx'), 'utf8');
        expect(panel).toContain('data-repository-virtualized="true"');
        expect(panel).not.toContain('shouldVirtualizeRepositoryFeed');
    });

    it('حفظ المسودة يُحرس من النقر المزدوج والمرفق بلا جلسة', () => {
        const compose = read('src/app/components/lawyer/SmartRepository/hooks/useRepositoryCompose.ts');
        expect(compose).toContain('savingRef');
        expect(compose).toContain('if (savingRef.current) return');
        expect(compose).toContain('hasSession: Boolean(uid)');
        expect(compose).not.toContain('if (attachmentFile && uid)');
        const rules = read(
            'src/app/components/lawyer/SmartRepository/hooks/repositoryComposeSaveRules.ts',
        );
        expect(rules).toContain("unsigned:");
        expect(rules).toContain('if (attachmentFile && !hasSession)');
    });

    it('dismissAll يصفّر المكدس وربط الإضبارة يلتقط الفشل', () => {
        const chrome = read(
            'src/app/components/lawyer/SmartRepository/hooks/repositoryChromeDismiss.ts',
        );
        expect(chrome).toContain('stack.length = 0');
        const dossier = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryComposeDossier.ts',
        );
        expect(dossier).toContain("SmartToast.error('تعذّر ربط المسودة بالإضبارة')");
        expect(dossier).toContain("SmartToast.error('تعذّر ربط الملف بالإضبارة')");
    });

    it('نقل الغرفة يُبطل كاش الخلاصة وتركيز البحث يفتح غرفة البطاقة', () => {
        const cache = read('src/app/services/repository/repositoryFeedWarmCache.ts');
        expect(cache).toContain('n.roomId');
        expect(cache).toContain('d.roomId');
        const model = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryUnifiedFeedModel.ts',
        );
        expect(model).toContain('resolveRepositoryFocusRoomFilter');
        expect(model).toContain('focusNoteId');
        const rooms = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryRoomActions.ts',
        );
        expect(rooms).toContain("SmartToast.error('تعذّر نقل المسودة')");
        const voice = read(
            'src/app/components/lawyer/SmartRepository/hooks/useRepositoryComposeVoice.ts',
        );
        expect(voice).toContain("SmartToast.error('تعذّر حفظ التسجيل')");
        const edit = read(
            'src/app/components/lawyer/SmartRepository/entryCards/useUniversalEntryCardEdit.ts',
        );
        expect(edit).toContain("SmartToast.error('تعذّر حفظ التعديلات')");
    });
});
