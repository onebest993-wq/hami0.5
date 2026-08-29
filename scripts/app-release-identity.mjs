/**
 * هوية الإصدار — مصدر حقيقة واحد للويب والأندرويد وSentry.
 *
 * كانت النسخة مكتوبة في أربعة مواضع مستقلة: `package.json` يقول 10.5.0،
 * و`production.ts` يعيد كتابة `'10.5.0'` نصّاً، وAndroid يقول `1.0` برمز `1`،
 * وSentry لا يقول شيئاً لأن `release` غير مضبوط أصلاً. النتيجة أن بلاغ عطل من
 * جهاز لا يمكن ردّه إلى بناء بعينه: لا الإصدار يميّزه ولا رمزه.
 *
 * الرقم هنا يُشتقّ من `package.json` وحده، ورمز Android يُحسب منه حسابياً
 * فيبقى تصاعدياً بالضرورة كما يشترط متجر Play.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** رمز البناء: بصمة الالتزام إن وُجدت، وإلا علامة صريحة أنه بناء محلي */
function resolveBuildId() {
    const injected = String(process.env.HAMI_BUILD_ID ?? '').trim();
    if (injected) return injected;
    try {
        return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return 'local';
    }
}

function parseSemver(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
    if (!match) {
        throw new Error(`[app-release-identity] نسخة غير صالحة في package.json: ${version}`);
    }
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/**
 * رمز نسخة Android: عدد صحيح تصاعدي مشتقّ من semver.
 * الحدود (minor/patch < 100) تمنع تصادم 1.10.0 مع 1.1.0 — يُكشف مبكراً لا في المتجر.
 */
export function androidVersionCode(version) {
    const { major, minor, patch } = parseSemver(version);
    if (minor > 99 || patch > 99) {
        throw new Error(`[app-release-identity] minor/patch يتجاوز 99 — صيغة الرمز تحتاج توسيعاً: ${version}`);
    }
    return major * 10_000 + minor * 100 + patch;
}

export function appReleaseIdentity() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const version = String(pkg.version ?? '').trim();
    const buildId = resolveBuildId();
    return {
        name: String(pkg.name ?? 'hami-app'),
        version,
        buildId,
        /** الصيغة التي يتوقّعها Sentry لربط البلاغ بالخرائط المرفوعة */
        release: `${pkg.name ?? 'hami-app'}@${version}+${buildId}`,
        androidVersionCode: androidVersionCode(version),
        androidVersionName: version,
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    console.log(JSON.stringify(appReleaseIdentity(), null, 2));
}
