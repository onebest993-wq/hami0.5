import { describe, expect, it } from 'vitest';

import { reorderBootScriptBeforeAppModule } from '@/vite-plugins/hamiBootScriptOrder';

describe('hamiBootScriptOrder', () => {
    it('يضع hami-boot.js قبل module entry في بناء Vite', () => {
        const builtLike = `<!DOCTYPE html>
<html>
  <head>
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
  </head>
  <body>
    <script src="/hami-boot.js" defer></script>
  </body>
</html>`;

        const out = reorderBootScriptBeforeAppModule(builtLike);
        const bootIdx = out.indexOf('/hami-boot.js');
        const moduleIdx = out.indexOf('type="module"');

        expect(bootIdx).toBeGreaterThan(-1);
        expect(moduleIdx).toBeGreaterThan(-1);
        expect(bootIdx).toBeLessThan(moduleIdx);
        expect(out).not.toMatch(/hami-boot\.js"[^>]*defer/i);
    });

    it('يحقن مهلة الحارس وعلامة التجريب معاً دون مسح السمات', () => {
        const out = reorderBootScriptBeforeAppModule(
            '<!DOCTYPE html><html lang="ar-IQ" dir="rtl" class="hami-boot-static-active"><head></head><body></body></html>',
            {
                demoBoot: true,
                hideStaticBoot: true,
                bootGuardMs: 4000,
            },
        );
        expect(out).toContain('data-hami-boot-guard-ms="4000"');
        expect(out).toContain('data-hami-demo-boot="1"');
        expect(out).toContain('hami-instant-boot-css');
        expect(out).not.toContain('hami-boot-static-active');
    });
});
