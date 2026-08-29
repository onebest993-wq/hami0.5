import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function toPosix(p: string): string {
    return p.replace(/\\/g, '/');
}

function walkProductionTs(dir: string, acc: string[] = []): string[] {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, ent.name);
        if (ent.isDirectory()) {
            if (['node_modules', 'dist', '__tests__'].includes(ent.name)) continue;
            walkProductionTs(full, acc);
            continue;
        }
        if (!/\.(ts|tsx)$/.test(ent.name)) continue;
        if (ent.name.includes('.test.') || ent.name.includes('.spec.')) continue;
        acc.push(full);
    }
    return acc;
}

function importsAdminUi(text: string): boolean {
    return (
        /from\s+['"][^'"]*@\/app\/components\/admin(?:\/|['"])/.test(text) ||
        /from\s+['"][^'"]*@\/app\/components\/AdminDashboard['"]/.test(text) ||
        /import\(\s*['"][^'"]*@\/app\/components\/admin(?:\/|['"])/.test(text) ||
        /import\(\s*['"][^'"]*@\/app\/components\/AdminDashboard['"]/.test(text) ||
        /from\s+['"](?:\.\.\/)+admin\//.test(text)
    );
}

function importsLawyerUi(text: string): boolean {
    return (
        /from\s+['"][^'"]*@\/app\/components\/lawyer(?:\/|['"])/.test(text) ||
        /import\(\s*['"][^'"]*@\/app\/components\/lawyer(?:\/|['"])/.test(text) ||
        /from\s+['"](?:\.\.\/)+lawyer\//.test(text)
    );
}

function isAllowedAdminUiImporter(rel: string): boolean {
    return (
        rel === 'src/app/HqRuntimeShell.tsx' ||
        rel.startsWith('src/hq/') ||
        rel.startsWith('src/app/surface/') ||
        rel.startsWith('src/app/components/admin/') ||
        rel === 'src/app/components/AdminDashboard.tsx' ||
        rel.startsWith('src/app/services/admin/') ||
        rel.startsWith('src/app/data/admin/')
    );
}

describe('hq lawyer boundary honesty', () => {
    it('واجهة المقر لا تستورد واجهة المحامي والعكس', () => {
        const lawyerFiles = walkProductionTs(join(root, 'src/app/components/lawyer'));
        const adminFiles = [
            ...walkProductionTs(join(root, 'src/app/components/admin')),
            join(root, 'src/app/components/AdminDashboard.tsx'),
        ];
        const lawyerLeaks = lawyerFiles.filter((file) => importsAdminUi(readFileSync(file, 'utf8')));
        const adminLeaks = adminFiles.filter((file) => importsLawyerUi(readFileSync(file, 'utf8')));
        expect(lawyerLeaks.map((f) => toPosix(relative(root, f)))).toEqual([]);
        expect(adminLeaks.map((f) => toPosix(relative(root, f)))).toEqual([]);
    });

    it('النواة والأدوات لا تستورد واجهة المقر؛ المقر لا يلمس كاش قارئ المحامي', () => {
        const kernelFiles = walkProductionTs(join(root, 'src/app/kernel'));
        const kernelLeaks = kernelFiles.filter((file) => {
            const text = readFileSync(file, 'utf8');
            return importsAdminUi(text) || importsLawyerUi(text);
        });
        expect(kernelLeaks.map((f) => toPosix(relative(root, f)))).toEqual([]);

        const utilsFiles = walkProductionTs(join(root, 'src/app/utils'));
        const utilsAdminLeaks = utilsFiles.filter((file) => importsAdminUi(readFileSync(file, 'utf8')));
        expect(utilsAdminLeaks.map((f) => toPosix(relative(root, f)))).toEqual([]);

        const notes = src('src/app/services/dossier-notes/smartLawArticleResolver.ts');
        expect(importsAdminUi(notes)).toBe(false);
        expect(notes).not.toContain('lawStructure');

        const api = src('src/app/components/admin/adminLawEntryApi.ts');
        expect(api).toContain('dispatchLawsCatalogChanged');
        expect(api).not.toContain('legalCodesDataCache');
        expect(api).not.toContain('civilLawRemoteCache');
        expect(api).not.toContain('executionLawRemoteCache');
        expect(api).not.toContain('personalStatusLawRemoteCache');
        expect(importsLawyerUi(api)).toBe(false);
    });

    it('استيراد واجهة المقر خارج جذر التركيب والخدمات محظور', () => {
        const files = walkProductionTs(join(root, 'src/app'));
        const leaks = files.filter((file) => {
            const rel = toPosix(relative(root, file));
            if (isAllowedAdminUiImporter(rel)) return false;
            return importsAdminUi(readFileSync(file, 'utf8'));
        });
        expect(leaks.map((f) => toPosix(relative(root, f)))).toEqual([]);
    });

    it('مسار المقر بلا إعدادات المحامي؛ الكتالوج يُزامَن عبر حدث النواة', () => {
        const inner = src('src/app/surface/inner.tsx');
        expect(inner).not.toContain('LawyerSettings');
        expect(inner).not.toContain("from '@/app/components/lawyer");
        expect(inner).toContain('AdminDashboard');

        expect(src('src/app/components/lawyer/criminal-system/legalCodes/legalCodesDataCache.ts')).toContain(
            'subscribeLawsCatalogChanged',
        );
        expect(src('src/app/utils/civilLawRemoteCache.ts')).toContain('subscribeLawsCatalogChanged');
        expect(src('src/app/utils/executionLawRemoteCache.ts')).toContain('subscribeLawsCatalogChanged');
        expect(src('src/app/utils/personalStatusLawRemoteCache.ts')).toContain('subscribeLawsCatalogChanged');
        expect(src('src/app/components/lawyer/smart-modal/parts/civilLawTaxonomy.ts')).toContain(
            "from '@/app/kernel/laws/civilLawTaxonomy'",
        );
        expect(src('src/app/components/admin/lawStructure.ts')).toContain(
            "from '@/app/kernel/laws/civilLawTaxonomy'",
        );
    });

    it('مدخل المحامي بلا قشرة المقر؛ المقر له مدخل HTML مستقل', () => {
        const lawyerShell = src('src/app/AppRuntimeShell.tsx');
        expect(lawyerShell).not.toContain('hqDoorSession');
        expect(lawyerShell).not.toContain("import('@/app/surface/inner')");
        expect(lawyerShell).not.toContain("import('@/app/surface/host')");
        expect(src('src/index.tsx')).not.toContain('isPlainDocumentPath');
        expect(src('src/index.tsx')).not.toContain('applyPlainDocumentSurface');
        expect(src('hq.html')).toContain('/src/hq/index.tsx');
        expect(src('src/hq/index.tsx')).toContain('markHqDocumentEntry');
        expect(src('src/app/HqRuntimeShell.tsx')).toContain("import('@/app/surface/inner')");
        expect(src('vite.config.mts')).toContain('hq.html');
        expect(src('vite.config.mts')).toContain('hamiHqDocumentRewrite');
        expect(src('vite.config.mts')).toContain('dist-hq');
        expect(src('vite.config.mts')).toContain('hqPhoneUiExclusionAliases');
        expect(src('vite.config.mts')).toContain('__HAMI_CLIENT_PRODUCT__');
        expect(src('vite.config.mts')).toContain('robots.txt');
        expect(src('src/app/context/authProviderRuntime.ts')).toContain('prefetchLawyerDashboardIfPhoneProduct');
        expect(src('src/app/context/authProviderRuntime.ts')).toContain("__HAMI_CLIENT_PRODUCT__ === 'hq'");
        expect(src('src/app/context/authProviderRuntime.ts')).toContain("import('@/app/services/settings/applicationWipe')");
        expect(src('src/app/security/SecurityInitializer.tsx')).toContain("import('@/app/security/lawyerLocalOnlyBoot')");
        expect(src('src/app/security/lawyerLocalOnlyBoot.ts')).toContain('installLawyerLocalOnlyIsolation');
        expect(src('src/app/runtime/lawyerDashboardLoader.ts')).toContain("__HAMI_CLIENT_PRODUCT__ === 'hq'");
        expect(src('vite.config.mts')).toContain('hqOmitAppWipe.ts');
        expect(src('vite.config.mts')).toContain('hqOmitWorkCache.ts');
        expect(src('vite.config.mts')).toContain('hqOmitDossierSnap.ts');
        expect(src('vite.config.mts')).toContain('hamiHqOmitLawyerWorkPlugin');
        expect(src('scripts/guard-dist-hq-runtime.mjs')).toContain('DecisionsScopeFilterBar');
        expect(src('scripts/guard-dist-hq-runtime.mjs')).toContain('criminalStore');
        expect(src('scripts/guard-dist-hq-runtime.mjs')).toContain('applicationWipe');
        expect(src('scripts/guard-dist-hq-runtime.mjs')).toContain('storageCache');
        expect(src('scripts/guard-dist-hq-runtime.mjs')).toContain('robots.txt');
        expect(src('vercel.json')).toContain('vercel-product-build.mjs');
        expect(src('vercel.json')).toContain('/api/handler');
        expect(src('scripts/bundle-vercel-api.mjs')).toContain('format: \'cjs\'');
        expect(src('scripts/bundle-vercel-api.mjs')).toContain("packages: 'external'");
        expect(src('scripts/bundle-vercel-api.mjs')).toContain('nodeDomPurifyStub');
        expect(src('scripts/vercel-product-build.mjs')).toContain('build:vercel');
        expect(src('scripts/vercel-product-build.mjs')).toContain('build:hq:vercel');
        expect(src('scripts/vercel-product-build.mjs')).toContain('HAMI_HQ_ALLOW_THIS_DEPLOYMENT');
        expect(src('vercel-hq.json')).toContain('build:hq:vercel');
        expect(src('package.json')).toContain('preview:hq');
    });

    it('مصادر المحامي لا تستدعي واجهات المقر؛ التوثيق الذاتي يبقى خارج قائمة المقر فقط', () => {
        const hqOnlyApis = [
            '/api/admin',
            '/api/laws/add',
            '/api/laws/clear',
            '/api/laws/import-bundle',
            '/api/forum/stats',
            '/api/forum/ban',
            '/api/forum/reports',
        ];
        const lawyerRoots = [
            join(root, 'src/app/components/lawyer'),
            join(root, 'src/app/AppRuntimeShell.tsx'),
            join(root, 'src/index.tsx'),
        ];
        const files: string[] = [];
        for (const item of lawyerRoots) {
            if (item.endsWith('.tsx') || item.endsWith('.ts')) files.push(item);
            else files.push(...walkProductionTs(item));
        }
        const leaks = files.filter((file) => {
            const text = readFileSync(file, 'utf8');
            return hqOnlyApis.some((api) => mentionsExactApiPath(text, api));
        });
        expect(leaks.map((f) => toPosix(relative(root, f)))).toEqual([]);

        const gate = src('src/app/api/security/headquartersOriginGate.ts');
        expect(gate).toContain('isHeadquartersOnlyApiPath');
        expect(gate).toContain('/api/auth/lawyer-verification');
        expect(gate).not.toMatch(/lawyer-verification['"]\s*\)\s*return true/);
    });
});

function mentionsExactApiPath(text: string, api: string): boolean {
    const escaped = api.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escaped}(?=[/'"?\`]|$)`).test(text);
}
