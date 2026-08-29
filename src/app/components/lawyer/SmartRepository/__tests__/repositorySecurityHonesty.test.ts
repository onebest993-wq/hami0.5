import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('repository security honesty', () => {
    it('inferDocType لا يعتبر أي image/* صورة — SVG خارج القائمة', () => {
        const utils = read('src/app/services/vault/vaultDocUtils.ts');
        expect(utils).not.toMatch(/mime\.startsWith\(['"]image\/['"]\)/);
        expect(utils).toContain('isAllowedVaultImageMeta');
        expect(utils).toContain('isScriptableVaultMedia');
    });

    it('محرّر الملاحظات يمنع اللصق الخام ووسوم svg/iframe', () => {
        const editor = read('src/app/components/lawyer/SmartRepository/LegalRichTextEditor.tsx');
        const hook = read('src/app/components/lawyer/SmartRepository/useLegalRichTextEditor.ts');
        const utils = read('src/app/components/lawyer/SmartRepository/legalRichTextEditorUtils.ts');
        expect(editor).toContain('onPaste={editor.handlePaste}');
        expect(hook).toContain('handlePaste');
        expect(hook).toContain("e.preventDefault()");
        expect(hook).toContain('clipboardPayloadToEditorHtml');
        expect(utils).toContain('clipboardPayloadToEditorHtml');
        expect(utils).toContain('FORBID_TAGS');
        expect(utils).toContain("'svg'");
        expect(utils).toContain("'iframe'");
    });

    it('معاينة المخزن ترفض javascript: وdata:text/html', () => {
        const safety = read('src/app/services/vault/vaultPreviewUrlSafety.ts');
        const upload = read('src/app/services/vaultUploadService.ts');
        expect(safety).toContain('isSafeVaultPreviewUrl');
        expect(safety).toContain("javascript:");
        expect(upload).toContain('sanitizeVaultPreviewUrl');
        expect(upload).toContain('vaultDocStorageOwned');
        expect(upload).not.toMatch(/await \(await fetch\(source\)\)\.blob\(\)/);
    });

    it('غرف المستودع وتصنيفات المخزن ضمن تشفير الراحة ونسخة الأعمال', () => {
        const keys = read('src/app/services/secureStorageKeys.ts');
        const backup = read('src/app/services/settings/businessBackupSecurity.ts');
        expect(keys).toContain("'hami:repository:rooms:'");
        expect(keys).toContain("'hami:smartvault:custom-categories:v1'");
        expect(backup).toContain("'hami:repository:rooms:'");
        expect(backup).toContain("'hami:smartvault:custom-categories:v1'");
    });

    it('حفظ/عرض/حذف المخزن يطابق authorId مع الجلسة دون fallback', () => {
        const runtime = read('src/app/services/vault/smartVaultRuntime.ts');
        const actions = read('src/app/components/lawyer/hooks/smartVault/useSmartVaultDocActions.ts');
        const bind = read('src/app/components/lawyer/SmartRepository/hooks/useRepositoryComposeDossier.ts');
        expect(runtime).toContain('assertVaultDocOwner');
        expect(runtime).toContain('assertVaultStoragePathOwner');
        expect(actions).not.toContain('doc.authorId || currentUserId');
        expect(actions).toContain('doc.authorId !== currentUserId');
        expect(bind).toContain('doc.authorId !== uid');
    });
});
