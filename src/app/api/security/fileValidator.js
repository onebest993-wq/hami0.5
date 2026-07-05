/**
 * File signature (magic bytes) validator against extension spoofing/polyglots.
 * Strict mode: only allows PDF/JPEG/PNG and rejects SVG entirely.
 */
import { createHash } from 'node:crypto';
function fileExtension(name) {
    var dot = name.lastIndexOf('.');
    if (dot < 0)
        return '';
    return name.slice(dot + 1).toLowerCase();
}
function startsWithBytes(buffer, bytes) {
    if (buffer.length < bytes.length)
        return false;
    for (var i = 0; i < bytes.length; i++) {
        if (buffer[i] !== bytes[i])
            return false;
    }
    return true;
}
function looksLikeSvg(buffer) {
    var sample = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf8').toLowerCase();
    return sample.includes('<svg') || sample.includes('image/svg+xml');
}
function isPdf(buffer) {
    // %PDF-
    return startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]);
}
function isPng(buffer) {
    return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}
function isJpeg(buffer) {
    return startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
}
export function validateFileBuffer(buffer, originalName) {
    if (!buffer || buffer.length === 0)
        return false;
    var ext = fileExtension(originalName);
    if (!ext)
        return false;
    // Hard reject SVG regardless of extension/content-type claims.
    if (ext === 'svg' || looksLikeSvg(buffer))
        return false;
    // Strict extension-to-signature matching.
    if (ext === 'pdf')
        return isPdf(buffer);
    if (ext === 'png')
        return isPng(buffer);
    if (ext === 'jpg' || ext === 'jpeg')
        return isJpeg(buffer);
    // Reject all unsupported types in strict mode.
    return false;
}
export function verifyFileContentHash(buffer, expectedHash) {
    var normalizedExpected = expectedHash.trim().toLowerCase();
    if (!normalizedExpected || !/^[a-f0-9]{64}$/.test(normalizedExpected))
        return false;
    var computed = createHash('sha256').update(buffer).digest('hex');
    return computed === normalizedExpected;
}
