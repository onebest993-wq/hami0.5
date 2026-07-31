#!/usr/bin/env node
/**
 * يولّد ملفات قوانين عامة versioned من المصدر canonical:
 *   src/data/laws/*.articles.json → public/static-law-data/
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const sourceDir = path.join(projectRoot, 'src', 'data', 'laws');
const outRoot = path.join(projectRoot, 'public', 'static-law-data');
const outVersionDir = path.join(outRoot, 'v1');
const manifestPath = path.join(outRoot, 'manifest.json');

function shortHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

async function main() {
    await fs.mkdir(outVersionDir, { recursive: true });

    const files = (await fs.readdir(sourceDir))
        .filter((f) => f.endsWith('.articles.json'))
        .sort();

    const bundles = {};
    for (const file of files) {
        const slug = file.replace(/\.articles\.json$/, '');
        const sourcePath = path.join(sourceDir, file);
        const raw = await fs.readFile(sourcePath, 'utf8');
        const parsed = JSON.parse(raw);
        const articleCount = Array.isArray(parsed?.articles) ? parsed.articles.length : 0;
        const hash = shortHash(raw);
        const outName = `${slug}.${hash}.json`;
        const publicPath = `/static-law-data/v1/${outName}`;
        await fs.writeFile(path.join(outVersionDir, outName), raw, 'utf8');
        bundles[slug] = {
            path: publicPath,
            sha256: crypto.createHash('sha256').update(raw).digest('hex'),
            articleCount,
            law_name: String(parsed?.law_name ?? '').trim(),
        };
    }

    const manifest = {
        version: 1,
        generatedAt: new Date().toISOString(),
        bundles,
    };
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(
        `[generate-static-law-data] wrote ${files.length} bundles + manifest → public/static-law-data/`,
    );
}

main().catch((err) => {
    console.error('[generate-static-law-data] failed:', err);
    process.exit(1);
});
