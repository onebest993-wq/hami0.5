import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('lawsuit grid hydrate + forum live-action honesty', () => {
    it('شبكة الأرشيف أثناء فك التشفير: عظام بطاقة بلا سبينر ذهبي', () => {
        const grid = read(
            'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx',
        );
        const slot = read(
            'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveCardPaintSlot.tsx',
        );
        expect(grid).toContain('LawsuitArchiveCardPaintSlot');
        expect(grid).toContain('data-testid="lawsuit-archive-loading"');
        expect(grid).toContain('aria-label="الإضابير"');
        expect(grid).toContain('resolveArchiveGridColumnCount');
        expect(grid).not.toContain('جاري تجهيز الإضابير');
        expect(grid).not.toContain('فكّ التشفير المحلي');
        expect(grid).not.toContain('animate-spin');
        expect(grid).not.toContain('border-t-[#E6C673]');
        expect(grid).not.toContain('fallback={null}');
        expect(grid).toContain('<LawsuitArchiveCardPaintSlot compact />');
        expect(grid).toContain('ARCHIVE_HYDRATE_SLOT_MAX_MS');
        expect(grid).toContain('hydrateSlotTimedOut');
        expect(slot).toContain('min-h-[260px]');
        expect(slot).toContain('min-h-[72px]');
        expect(slot).toContain('rounded-[1.15rem]');
        expect(slot).not.toContain('animate-pulse');
        expect(slot).not.toContain('linear-gradient');
        expect(slot).not.toContain('جاري');
    });

    it('أفعال المنتدى الحيّة: نص الزر يبقى + aria-busy بلا Loader2', () => {
        const edit = read(
            'src/app/components/lawyer/CommunityScreen/components/EditPostModal.tsx',
        );
        const comment = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumCommentRowEdit.tsx',
        );
        const create = read(
            'src/app/components/lawyer/CommunityScreen/components/CreateGroupModal.tsx',
        );
        const del = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumDeleteConfirmModal.tsx',
        );
        const attach = read(
            'src/app/components/lawyer/CommunityScreen/components/QuestionCardAttachmentDocument.tsx',
        );
        const repo = read(
            'src/app/components/lawyer/CommunityScreen/components/RepositoryCardActions.tsx',
        );
        expect(edit).toContain('aria-busy={savingEdit || undefined}');
        expect(edit).toContain('حفظ');
        expect(edit).not.toContain('Loader2');
        expect(edit).not.toContain('جاري الحفظ');
        expect(comment).toContain('aria-busy={isSavingEdit || undefined}');
        expect(comment).not.toContain('جاري الحفظ');
        expect(create).toContain('aria-busy={submitting || undefined}');
        expect(create).toContain('إنشاء المجموعة');
        expect(create).not.toContain('جاري الإنشاء');
        expect(del).toContain('aria-busy={loading || undefined}');
        expect(del).not.toContain('Loader2');
        expect(attach).not.toContain('Loader2');
        expect(attach).toContain('حفظ في الجهاز');
        expect(repo).not.toContain('Loader2');
        expect(repo).toContain('aria-busy={downloadingId === doc.id || undefined}');
        expect(repo).toContain('aria-busy={deletingId === doc.id || undefined}');
        const commentHeader = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumCommentRowHeader.tsx',
        );
        expect(commentHeader).toContain('aria-busy={isDeletingComment || undefined}');
        expect(commentHeader).not.toContain('جاري الحذف');
    });

    it('مسجّل الصوت أثناء الحفظ: يبقى إيقاف التسجيل + aria-busy', () => {
        const voice = read(
            'src/app/components/lawyer/ActionModals/VoiceRecorderModalView.tsx',
        );
        expect(voice).toContain('aria-busy={isSaving || undefined}');
        expect(voice).toContain('isRecording || isSaving');
        expect(voice).toContain('إيقاف التسجيل');
        expect(voice).not.toContain('جاري الحفظ');
    });
});
