import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const repo = join(root, 'src/app/components/lawyer/SmartRepository');
const vaultModal = join(root, 'src/app/components/lawyer/SmartVaultModal');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('repository quality honesty', () => {
    it('محرّك التأشير مقسوم: ألوان / DOM / مدى / تطبيق', () => {
        expect(existsSync(join(repo, 'legalRichTextEditorHighlightColors.ts'))).toBe(true);
        expect(existsSync(join(repo, 'legalRichTextEditorHighlightDom.ts'))).toBe(true);
        expect(existsSync(join(repo, 'legalRichTextEditorHighlightRange.ts'))).toBe(true);
        const engine = read('src/app/components/lawyer/SmartRepository/legalRichTextEditorHighlight.ts');
        expect(engine).toContain("from './legalRichTextEditorHighlightColors'");
        expect(engine).toContain("from './legalRichTextEditorHighlightDom'");
        expect(engine).toContain("from './legalRichTextEditorHighlightRange'");
        expect(engine).toContain('export function applyLegalHighlight');
        expect(engine).not.toContain('function getTextSegmentsInRange');
        expect(engine).not.toContain('restoreSelectionAround');
        const range = read(
            'src/app/components/lawyer/SmartRepository/legalRichTextEditorHighlightRange.ts',
        );
        expect(range).toContain('export function getTextSegmentsInRange');
    });

    it('الماسح: منطق الكاميرا/الحفظ في hook واللوحة JSX فقط', () => {
        expect(existsSync(join(vaultModal, 'useSmartVaultScanner.ts'))).toBe(true);
        const hook = read('src/app/components/lawyer/SmartVaultModal/useSmartVaultScanner.ts');
        const panel = read('src/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel.tsx');
        expect(hook).toContain('export function useSmartVaultScanner');
        expect(hook).toContain('saveInFlightRef');
        expect(hook).toContain('startTransition');
        expect(hook).toContain('paintScannerCaptureCanvas');
        expect(panel).toContain('useSmartVaultScanner');
        expect(panel).toContain('SmartVaultScannerPhases');
        expect(panel).not.toContain('saveInFlightRef');
        expect(panel).not.toContain('requestScannerCameraStream');
        expect(panel).not.toContain('data-testid="vault-scanner-capture"');
        expect(panel).toContain('data-testid="vault-scanner-panel"');
        const phases = read('src/app/components/lawyer/SmartVaultModal/SmartVaultScannerPhases.tsx');
        expect(phases).toContain('data-testid="vault-scanner-capture"');
        expect(phases).toContain('export function ScannerIdlePhase');
    });

    it('المسودة: قواعد الحفظ والصوت والخلاصة والبطاقة مقسومة', () => {
        expect(existsSync(join(repo, 'hooks/repositoryComposeSaveRules.ts'))).toBe(true);
        expect(existsSync(join(repo, 'hooks/useRepositoryComposeVoice.ts'))).toBe(true);
        expect(existsSync(join(repo, 'hooks/useRepositoryUnifiedFeedModel.ts'))).toBe(true);
        expect(existsSync(join(repo, 'entryCards/VaultEntryCardActions.tsx'))).toBe(true);
        expect(existsSync(join(repo, 'hooks/buildRepositoryComposeNote.ts'))).toBe(true);
        expect(existsSync(join(repo, 'hooks/useRepositoryRoomsGallery.ts'))).toBe(true);
        expect(existsSync(join(repo, 'useLegalRichTextEditorTextFormat.ts'))).toBe(true);
        expect(existsSync(join(repo, 'entryCards/GlobalEntryCardActions.tsx'))).toBe(true);
        expect(existsSync(join(repo, 'repositoryRoomsGalleryQuery.ts'))).toBe(true);
        const compose = read('src/app/components/lawyer/SmartRepository/hooks/useRepositoryCompose.ts');
        expect(compose).toContain('resolveComposeSaveBlock');
        expect(compose).toContain('useRepositoryComposeVoice');
        expect(compose).toContain('buildRepositoryComposeNote');
        expect(compose).not.toContain('requestMicrophoneStream');
        const feed = read('src/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed.tsx');
        expect(feed).toContain('useRepositoryUnifiedFeedModel');
        expect(feed).toContain('value={modalRoot}');
        expect(feed).not.toContain('useSmartVault(');
        expect(feed).not.toContain('useRepositoryEscapeStack');
        const card = read('src/app/components/lawyer/SmartRepository/entryCards/VaultEntryCard.tsx');
        expect(card).toContain('VaultEntryCardActions');
        expect(card).not.toContain('repository-vault-edit-');
        const globalCard = read('src/app/components/lawyer/SmartRepository/entryCards/GlobalEntryCard.tsx');
        expect(globalCard).toContain('GlobalEntryCardActions');
        expect(globalCard).not.toContain('repository-note-pin-');
        const editor = read('src/app/components/lawyer/SmartRepository/useLegalRichTextEditor.ts');
        expect(editor).toContain('useLegalRichTextEditorTextFormat');
        expect(editor).not.toContain('FONT_SIZES');
        const utils = read('src/app/components/lawyer/SmartRepository/legalRichTextEditorUtils.ts');
        expect(utils).toContain('export function clipboardPayloadToEditorHtml');
        expect(editor).toContain('clipboardPayloadToEditorHtml');
        expect(editor).not.toContain(".replace(/\\n/g, '<br>')");
    });
});
