/**
 * @capacitor/cli@6 يستدعي tar.default.extract عبر tslib، بينما tar@6/7
 * لا يصدّر default في CJS — فيفشل `cap add` بـCannot read properties of undefined.
 * هذا الرقع يثبّت الاستدعاء على tar.extract || tar.default.extract دون لمس المنطق.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(ROOT, 'node_modules/@capacitor/cli/dist/util/template.js');

if (!fs.existsSync(target)) {
  console.log('[cap-tar-compat] skip — @capacitor/cli not installed');
  process.exit(0);
}

const src = fs.readFileSync(target, 'utf8');
if (src.includes('tar_1.default || tar_1') || src.includes('tar.extract || tar.default')) {
  console.log('[cap-tar-compat] OK — already patched');
  process.exit(0);
}

if (!src.includes('tar_1.default.extract')) {
  console.log('[cap-tar-compat] skip — unexpected template.js shape');
  process.exit(0);
}

const next = src.replace(
  'await tar_1.default.extract({ file: src, cwd: dir });',
  `const tar = tar_1.default || tar_1;
    await tar.extract({ file: src, cwd: dir });`,
);

fs.writeFileSync(target, next, 'utf8');
console.log('[cap-tar-compat] patched @capacitor/cli template extract for tar CJS');
