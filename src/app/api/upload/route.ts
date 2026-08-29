import { getSupabaseAdminClient } from '../security/supabaseAdminClient.ts';
import { requireWifeCloudWrite, unwrapWifeUser } from '../security/bffAuth.ts';
import { wifeForbiddenResponse } from '../security/wifeValidator.ts';
import { validateFileBuffer, verifyFileContentHash } from '../security/fileValidator.ts';
import { scanBufferForMalware } from '../../services/server/MalwareScanService.ts';
import {
  ALLOWED_UPLOAD_CATEGORIES,
  buildCategoryObjectPath,
  isForumEncryptedUpload,
  resolveUploadBucketForCategory,
  SIGNED_URL_TTL_SEC,
} from './uploadStorageUtils.ts';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function pickUploadedFile(formData: FormData): File | null {
  const direct = formData.get('file');
  if (direct instanceof File) return direct;

  for (const value of formData.values()) {
    if (value instanceof File) return value;
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeCloudWrite(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    const contentHashHeader =
      request.headers.get('x-wife-content-hash') ??
      request.headers.get('X-WIFE-Content-Hash');
    if (!contentHashHeader || !contentHashHeader.trim()) {
      return wifeForbiddenResponse({ request, reason: 'signature_failed', detail: 'missing_content_hash' });
    }

    // 3) Multipart extraction.
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return json(400, { ok: false, error: 'Invalid multipart payload' });
    }

    const file = pickUploadedFile(formData);
    if (!file) {
      return json(400, { ok: false, error: 'No file provided' });
    }

    const categoryRaw = formData.get('category');
    const category = typeof categoryRaw === 'string' ? categoryRaw.trim() : '';
    if (!ALLOWED_UPLOAD_CATEGORIES.has(category)) {
      return json(400, { ok: false, error: 'Invalid upload category' });
    }

    if (file.size <= 0) {
      return json(400, { ok: false, error: 'Empty file is not allowed' });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return json(400, { ok: false, error: 'File exceeds maximum allowed size' });
    }
    if ((file.type || '').toLowerCase() === 'image/svg+xml') {
      return json(400, { ok: false, error: 'Invalid or malicious file' });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!verifyFileContentHash(buffer, contentHashHeader)) {
      return json(403, { ok: false, error: 'File Tampering Detected' });
    }

    const forumEncrypted = isForumEncryptedUpload(category, file.name);
    if (!forumEncrypted && !validateFileBuffer(buffer, file.name)) {
      return json(400, { ok: false, error: 'Invalid or malicious file' });
    }

    // 5) Malware scanning (heuristic and optional API adapter).
    const malwareScan = await scanBufferForMalware(buffer);
    if (!malwareScan.safe) {
      return json(400, {
        ok: false,
        error: 'Security warning: file failed malware scan',
        reason: malwareScan.reason ?? 'malware_detected',
      });
    }

    // 6) Secure storage upload via privileged admin client.
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return json(500, { ok: false, error: 'Server storage client is not configured' });
    }

    const bucket = resolveUploadBucketForCategory(category);
    const objectPath = buildCategoryObjectPath(userId, category, file.name);

    const { error } = await admin.storage.from(bucket).upload(objectPath, buffer, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) {
      return json(500, { ok: false, error: 'Storage upload failed' });
    }

    const { data: signedData, error: signedErr } = await admin.storage
      .from(bucket)
      .createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);
    if (signedErr) {
      return json(500, { ok: false, error: 'Failed to create download URL' });
    }

    return json(200, {
      ok: true,
      bucket,
      path: objectPath,
      fullPath: objectPath,
      downloadUrl: signedData?.signedUrl ?? null,
    });
  } catch {
    return json(500, { ok: false, error: 'Internal upload error' });
  }
}
