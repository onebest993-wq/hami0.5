/**
 * يولّد أصول الإقلاع من شعار النسر: خلفية شفافة + قفل نسبة + حشوة دائرة 160dp/288dp.
 * لا يُستدعى في الإقلاع نفسه — توليد لمرة عند تغيّر المصدر.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRANDING = path.join(ROOT, 'scripts/native-ready/android/branding');
const SOURCE_CANDIDATES = [
    path.join(BRANDING, 'hami-eagle-source.png'),
    path.join(
        process.env.USERPROFILE ?? '',
        '.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/assets',
        'c__Users_HEX_STORE_AppData_Roaming_Cursor_User_workspaceStorage_d16ae55eb35548bc96cd01216ed46c1d_images_Adobe_Express_-_file__2___1___6_-4a203097-5664-4cc5-9e97-36606ca1ef84.png',
    ),
];

const MAX_BYTES = 30 * 1024;
const CANVAS_PX = 576; /* 288dp × 2 — يكفي لحدة xxxhdpi مع ضغط WebP */
const CIRCLE_PX = Math.round(CANVAS_PX * (160 / 288));

function findSource() {
    for (const p of SOURCE_CANDIDATES) {
        if (p && fs.existsSync(p)) return p;
    }
    throw new Error('hami eagle source PNG not found');
}

async function punchBlackAndCrop(srcPath) {
    const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = Buffer.from(data);
    const { width, height, channels } = info;
    for (let i = 0; i < px.length; i += channels) {
        const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        if (lum < 14) px[i + 3] = 0;
        else if (lum < 34) px[i + 3] = Math.round(px[i + 3] * ((lum - 14) / 20));
    }

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (px[(y * width + x) * channels + 3] > 10) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX <= minX || maxY <= minY) throw new Error('logo bounding box empty after punch');

    const pad = 4;
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    const cropW = Math.min(width - left, maxX - minX + 1 + pad * 2);
    const cropH = Math.min(height - top, maxY - minY + 1 + pad * 2);

    return sharp(px, { raw: { width, height, channels } })
        .extract({ left, top, width: cropW, height: cropH })
        .png()
        .toBuffer();
}

async function encodeWebp(input, { maxEdge, quality, lossless }) {
    let pipeline = sharp(input);
    if (maxEdge) {
        pipeline = pipeline.resize({
            width: maxEdge,
            height: maxEdge,
            fit: 'inside',
            withoutEnlargement: true,
        });
    }
    return pipeline.webp({ quality, alphaQuality: 90, effort: 6, lossless: Boolean(lossless) }).toBuffer();
}

async function writeWebpUnderCap(pngBuf, dest, { maxEdge, quality }) {
    const lossless = await encodeWebp(pngBuf, { maxEdge, quality: 100, lossless: true });
    let q = quality;
    let buf = lossless;
    let used = 'lossless';
    if (lossless.length > MAX_BYTES) {
        used = 'lossy';
        for (let i = 0; i < 14; i++) {
            buf = await encodeWebp(pngBuf, { maxEdge, quality: q, lossless: false });
            if (buf.length <= MAX_BYTES || q <= 28) break;
            q -= 6;
        }
    } else {
        buf = lossless;
        q = 100;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return { bytes: buf.length, quality: q, used };
}

async function writePaddedIcon(croppedPng, dest) {
    const meta = await sharp(croppedPng).metadata();
    const lw = meta.width ?? 1;
    const lh = meta.height ?? 1;
    const diag = Math.hypot(lw, lh);
    const scale = (CIRCLE_PX * 0.9) / diag;
    const dw = Math.max(1, Math.round(lw * scale));
    const dh = Math.max(1, Math.round(lh * scale));
    const resized = await sharp(croppedPng).resize(dw, dh).ensureAlpha().toBuffer();
    const left = Math.round((CANVAS_PX - dw) / 2);
    const top = Math.round((CANVAS_PX - dh) / 2);

    const composedPng = await sharp({
        create: {
            width: CANVAS_PX,
            height: CANVAS_PX,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{ input: resized, left, top }])
        .png()
        .toBuffer();
    return writeWebpUnderCap(composedPng, dest, { maxEdge: CANVAS_PX, quality: 88 });
}

function copy(from, to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
}

const src = findSource();
fs.mkdirSync(BRANDING, { recursive: true });
const archived = path.join(BRANDING, 'hami-eagle-source.png');
if (path.resolve(src) !== path.resolve(archived)) {
    fs.copyFileSync(src, archived);
}

const cropped = await punchBlackAndCrop(archived);
const logoReady = path.join(BRANDING, 'hami_splash_logo.webp');
const paddedReady = path.join(BRANDING, 'hami_splash_logo_padded.webp');

const logo = await writeWebpUnderCap(cropped, logoReady, { maxEdge: 320, quality: 82 });
const padded = await writePaddedIcon(cropped, paddedReady);

const dests = [
    ['android/app/src/main/res/drawable-nodpi/hami_splash_logo.webp', logoReady],
    ['android/app/src/main/res/drawable-nodpi/hami_splash_logo_padded.webp', paddedReady],
    ['scripts/native-ready/android/drawable-nodpi/hami_splash_logo.webp', logoReady],
    ['scripts/native-ready/android/drawable-nodpi/hami_splash_logo_padded.webp', paddedReady],
    ['scripts/native-ready/ios/LaunchLogo.imageset/hami_splash_logo.webp', logoReady],
];
for (const [rel, from] of dests) copy(from, path.join(ROOT, rel));

console.log(
    JSON.stringify(
        {
            source: archived,
            logoKb: +(logo.bytes / 1024).toFixed(1),
            paddedKb: +(padded.bytes / 1024).toFixed(1),
            logoQ: logo.quality,
            paddedQ: padded.quality,
            capKb: 30,
        },
        null,
        2,
    ),
);
if (logo.bytes > MAX_BYTES || padded.bytes > MAX_BYTES) {
    console.error('splash webp exceeds 30KB');
    process.exit(1);
}
