import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/**
 * يختم أصول القشرة الثابتة بتجزئة محتواها وينقلها إلى `assets/`.
 *
 * `hami-boot.js` وورقتا القشرة تخرج من `public/` بأسمائها الحرفية، فلا تحمل
 * بصمة محتوى. أفضل ما يمكن قوله لها في الترويسات هو `max-age` قصير: أي جهاز
 * يحمل نسخة قديمة إلى أن تنتهي المهلة. والملف يضبط `data-hami-native`
 * و`data-hami-platform` ونسق الألوان وحارس فشل الإقلاع قبل أي شيء آخر —
 * اقترانه بحزمة تطبيق أحدث منه ليس تأخّراً في التحديث بل تنافر إصدارين.
 *
 * بالتجزئة يصبح الاسم دالّة للمحتوى: النسخة القديمة والجديدة عنوانان مختلفان،
 * فلا حاجة لمهلة تنتهي، وتنطبق عليها سياسة `assets/*` الأبدية تلقائياً.
 */

export const SHELL_ASSETS = ['hami-boot.js', 'hami-boot-shell.css', 'hami-home-static-shell.css'] as const;

/** ملفات المخرجات التي تذكر مسارات القشرة نصّاً */
const REWRITE_TARGETS = ['index.html', 'sw.js'] as const;

function contentHash(body: Buffer): string {
    return createHash('sha256').update(body).digest('hex').slice(0, 8);
}

export function hamiShellAssetHash(): Plugin {
    let outDir = '';
    let shellAssetsHashed = false;

    return {
        name: 'hami-shell-asset-hash',
        apply: 'build',
        /*
         * بلا `enforce`. الترتيب هنا عقد لا تفصيل: `hami-sw-cache-stamp` يشتقّ
         * ختمه من أسماء `assets/`، فلو سبقنا لختم قائمةً لا تعرف القشرة بعد،
         * وبقي اسم الذاكرة ثابتاً رغم تبدّل ورقة قشرة. `post` كان يدفعنا خلفه
         * فعلاً؛ ترتيب المصفوفة يضعنا قبله — والحارس هناك يمنع عودة الخطأ صامتاً.
         */
        configResolved(config) {
            outDir = path.resolve(config.root, config.build.outDir);
        },
        closeBundle() {
            if (!outDir || shellAssetsHashed) return;

            const assetsDir = path.join(outDir, 'assets');
            const rewrites = new Map<string, string>();

            for (const name of SHELL_ASSETS) {
                const source = path.join(outDir, name);
                const ext = path.extname(name);
                const stem = path.basename(name, ext);
                if (!fs.existsSync(source)) {
                    const existing = fs.existsSync(assetsDir)
                        ? fs
                              .readdirSync(assetsDir)
                              .find((file) => file.startsWith(`${stem}.`) && file.endsWith(ext))
                        : undefined;
                    if (existing) {
                        rewrites.set(`/${name}`, `/assets/${existing}`);
                        continue;
                    }
                    throw new Error(`[hami-shell-asset-hash] ${name} مفقود من ${path.basename(outDir)}`);
                }
                const body = fs.readFileSync(source);
                const hashed = `${stem}.${contentHash(body)}${ext}`;
                fs.mkdirSync(assetsDir, { recursive: true });
                fs.writeFileSync(path.join(assetsDir, hashed), body);
                fs.rmSync(source);
                rewrites.set(`/${name}`, `/assets/${hashed}`);
            }

            for (const target of REWRITE_TARGETS) {
                const file = path.join(outDir, target);
                if (!fs.existsSync(file)) continue;
                const before = fs.readFileSync(file, 'utf8');
                let after = before;
                for (const [from, to] of rewrites) {
                    after = after.split(from).join(to);
                }
                if (after !== before) fs.writeFileSync(file, after, 'utf8');

                const stale = [...rewrites.keys()].filter(
                    (from) => after.includes(`"${from}"`) || after.includes(`'${from}'`),
                );
                if (stale.length) {
                    throw new Error(`[hami-shell-asset-hash] مرجع غير مختوم في ${target}: ${stale.join(', ')}`);
                }
            }

            shellAssetsHashed = true;
        },
    };
}
