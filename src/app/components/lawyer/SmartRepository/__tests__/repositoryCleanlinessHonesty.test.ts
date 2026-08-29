import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(process.cwd(), 'src/app/components/lawyer/SmartRepository');

function readChrome(): string {
    return ['repositoryChrome.css', 'repositoryChromeFilters.css', 'repositoryChromeCards.css']
        .map((file) => readFileSync(join(dir, file), 'utf8'))
        .join('\n');
}

describe('repository cleanliness honesty', () => {
    it('لا رموز إنشاء/تصنيف ميتة في الثيم', () => {
        const theme = readFileSync(join(dir, 'smartRepositoryTheme.ts'), 'utf8');
        expect(theme).not.toContain('REPO_ACTION_GRID');
        expect(theme).not.toContain('REPO_ACTION_BTN');
        expect(theme).not.toContain('REPO_ACTION_ICON_WELL');
        expect(theme).not.toContain('REPO_LAYOUT_ICON_BTN');
        expect(theme).not.toContain('REPO_VIEW_BTN');
        expect(theme).not.toContain('REPO_TOOLBAR_ROW');
        expect(theme).not.toContain('REPO_FILTER_ROW');
        expect(theme).not.toContain('REPO_BTN_GOLD');
        expect(theme).not.toContain('REPO_CUSTOM_CAT_');
        expect(theme).not.toContain('REPO_BACK_BTN');
        expect(theme).not.toContain('REPO_FILTER_CHIP');
        expect(theme).toContain('REPO_ADD_MENU_BTN');
        expect(theme).toContain('REPO_FILTER_RAIL');
        expect(theme).toContain('REPO_ICON_BTN');
        expect(theme).toContain('REPO_ROOM_CHIP');
    });

    it('لا كروم CSS لشبكة الإجراءات أو تخطيطات المعرض/الزمني أو الطبقة الزخرفية', () => {
        const css = readChrome();
        expect(css).not.toContain('.hami-repository-action-grid');
        expect(css).not.toContain('.hami-repository-action-btn');
        expect(css).not.toContain('.hami-repository-action-icon-well');
        expect(css).not.toContain('.hami-repository-layout-toggle');
        expect(css).not.toContain('.hami-repository-rooms-panel');
        expect(css).not.toContain('.hami-repo-chip');
        expect(css).not.toContain('.hami-repo-layout--compact');
        expect(css).not.toContain('.hami-repo-layout--timeline');
        expect(css).not.toContain('.hami-repo-layout--gallery');
        expect(css).not.toContain('.hami-repo-timeline-dot');
        expect(css).not.toContain('.hami-repo-action-tone--');
        expect(css).not.toContain('hami-repository-ambient');
        expect(css).not.toContain('hami-repo-card-frame--stack');
        expect(css).toContain('.hami-repo-layout--grid');
        expect(css).toContain('.hami-repo-layout--list');
    });

    it('تخطيط الخلاصة الحي شبكة/قائمة فقط مع تطبيع المفاتيح القديمة', () => {
        const layout = readFileSync(join(dir, 'repositoryFeedLayout.ts'), 'utf8');
        expect(layout).toContain("export type RepositoryFeedLayoutId = 'grid' | 'list'");
        expect(layout).not.toContain('REPOSITORY_FEED_LAYOUT_OPTIONS');
        expect(layout).not.toContain('getRepositoryFeedItemClass');
        expect(layout).not.toContain('repositoryFeedLayoutLabel');
        expect(layout).toContain('LEGACY_STORED_LAYOUT_IDS');
        const frame = readFileSync(join(dir, 'RepositoryCardFrame.tsx'), 'utf8');
        expect(frame).not.toContain('hami-repo-timeline-dot');
        expect(frame).not.toContain("innerLayout === 'compact'");
        const picker = readFileSync(join(dir, 'RepositoryViewLayoutPicker.tsx'), 'utf8');
        expect(picker).not.toContain('repository-layout-compact');
        const hook = readFileSync(join(dir, 'hooks/useCompactToolbarScroll.ts'), 'utf8');
        expect(hook).toContain('export function useCompactToolbarScroll');
        const compactToolbar = readFileSync(join(dir, 'LegalRichTextEditorCompactToolbar.tsx'), 'utf8');
        expect(compactToolbar).toContain("from './hooks/useCompactToolbarScroll'");
        expect(compactToolbar).toContain('export function LegalRichTextEditorCompactToolbar');
        const toolbar = readFileSync(join(dir, 'LegalRichTextEditorToolbar.tsx'), 'utf8');
        expect(toolbar).toContain("from './LegalRichTextEditorCompactToolbar'");
        expect(toolbar).not.toContain('function useCompactToolbarScroll');
        expect(toolbar).not.toContain('function CompactToolbar');
        const android = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/dashboard/lawyerHomeFx-android.css'),
            'utf8',
        );
        expect(android).not.toContain('.hami-repository-action-grid');
        expect(android).not.toContain('.hami-repository-action-btn');
        expect(existsSync(join(dir, 'RepositoryFeedSection.tsx'))).toBe(false);
        const panel = readFileSync(join(dir, 'RepositoryFeedPanel.tsx'), 'utf8');
        expect(panel).toContain('scrollParentRef');
        expect(panel).not.toContain('onCreateNote');
        expect(panel).not.toContain('active: boolean');
        expect(panel).not.toContain('hidden={!active}');
        const unified = readFileSync(join(dir, 'SmartRepositoryUnifiedFeed.tsx'), 'utf8');
        expect(unified).not.toContain('notesBootSettled');
        expect(unified).not.toContain('feedLoading');
        expect(unified).not.toContain('RepositoryFeedSection');
        expect(unified).toContain("from './hooks/useRepositoryUnifiedFeedModel'");
        const model = readFileSync(join(dir, 'hooks/useRepositoryUnifiedFeedModel.ts'), 'utf8');
        expect(model).toContain("from './useRepositoryRoomActions'");
    });

    it('شريط الغرف بلا تصنيف ميت — التصنيف في لوحة البحث فقط', () => {
        const rail = readFileSync(join(dir, 'RepositoryFiltersRail.tsx'), 'utf8');
        expect(rail).not.toContain('classificationInSearch');
        expect(rail).not.toContain('REPOSITORY_ACTION_CHIPS');
        expect(rail).not.toContain('onMainFilterChange');
        expect(rail).toContain('RepositoryRoomMenu');
        const controls = readFileSync(join(dir, 'RepositoryControlsSection.tsx'), 'utf8');
        expect(controls).not.toContain('onMainFilterChange');
        expect(controls).not.toContain('REPOSITORY_ACTION_CHIPS');
        expect(controls).toContain('VaultSearchFilterHub');
        const deck = readFileSync(join(dir, 'RepositoryClassificationDeck.tsx'), 'utf8');
        expect(deck).toContain('repository-filter-all');
        const lifecycle = readFileSync(join(dir, 'hooks/useRepositoryLifecycle.ts'), 'utf8');
        expect(lifecycle).not.toContain('feedLoading');
        expect(lifecycle).not.toContain('isShellReady');
        const compose = readFileSync(join(dir, 'hooks/useRepositoryCompose.ts'), 'utf8');
        expect(compose).not.toContain('function stripHtml');
        expect(compose).toContain('stripRepositoryHtml');
        expect(compose).toContain('useRepositoryComposeDossier');
        expect(compose).toContain('useRepositoryComposeVoice');
        expect(compose).toContain('resolveComposeSaveBlock');
        expect(compose).toContain('buildRepositoryComposeNote');
        expect(compose).not.toContain('ملاحظة بدون عنوان');
        const gallery = readFileSync(join(dir, 'RepositoryRoomsGallery.tsx'), 'utf8');
        expect(gallery).toContain('useRepositoryRoomsGallery');
        expect(gallery).not.toContain('filterRepositoryRoomsByQuery');
        const editor = readFileSync(join(dir, 'useLegalRichTextEditor.ts'), 'utf8');
        expect(editor).not.toMatch(/return \{[\s\S]*\bexec,/);
        expect(editor).toContain("from './useLegalRichTextEditorHighlightMode'");
        expect(editor).toContain("from './useLegalRichTextEditorTextFormat'");
        expect(editor).not.toContain('function insertNeutralSpan');
        const highlight = readFileSync(join(dir, 'legalRichTextEditorHighlight.ts'), 'utf8');
        expect(highlight).not.toContain('export function matchHighlightColor');
        expect(highlight).not.toContain('export function removeHighlightsInRange');
        const lazy = readFileSync(join(dir, 'RepositoryLazyPanels.tsx'), 'utf8');
        expect(lazy).not.toContain('export type { SmartVaultDoc }');
        const utils = readFileSync(join(dir, 'legalRichTextEditorUtils.ts'), 'utf8');
        expect(utils).not.toContain('__sanitizeEditorStyleForTests');
        const overlay = readFileSync(
            join(
                process.cwd(),
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(overlay).not.toContain('notesBootSettled');
        const modal = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/SmartRepositoryModal.tsx'),
            'utf8',
        );
        expect(modal).not.toContain('notesBootSettled');
        const strip = readFileSync(
            join(process.cwd(), 'src/app/services/repository/stripRepositoryHtml.ts'),
            'utf8',
        );
        expect(strip).toContain('export function stripRepositoryHtml');
        const feedSvc = readFileSync(
            join(process.cwd(), 'src/app/services/repository/repositoryUnifiedFeed.ts'),
            'utf8',
        );
        expect(feedSvc).not.toContain('function stripHtmlForSearch');
        expect(feedSvc).toContain('stripRepositoryHtml');
        const dossierNotes = readFileSync(
            join(process.cwd(), 'src/app/services/repository/repositoryDossierNotes.ts'),
            'utf8',
        );
        expect(dossierNotes).not.toContain('function stripHtml');
        expect(dossierNotes).toContain('stripRepositoryHtml');
    });
});
