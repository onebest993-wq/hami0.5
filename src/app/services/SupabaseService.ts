import { supabase } from '@/app/lib/supabase-client';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { CryptoService } from '@/app/services/CryptoService';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';
import { probeSameOriginApi } from '@/app/runtime/sameOriginApiProbe';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';

function scheduleWorkCheckpointAfterCloudWrite(): void {
  void import('@/app/services/cloud/workCloudCheckpoint').then((m) => {
    m.scheduleWorkCloudCheckpoint();
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export interface ExecutionFileDTO_Supabase {
  id: string;
  caseNo: string;
  executionType: 'مدني' | 'شرعي' | 'التزام بعمل/تسليم';
  court: string;
  executionBasis: string;
  creditor: Record<string, unknown>;
  debtor: Record<string, unknown>;
  totalAmount: number;
  status?: 'active' | 'archived' | 'completed';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface LawsuitFile {
  id: string;
  caseNo: string;
  court: string;
  stage: 'بداءة' | 'استئناف' | 'تمييز';
  caseType?: string;
  parentId?: string | null;
  parties: Array<Record<string, unknown>>;
  status?: 'active' | 'archived' | 'completed';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface GlobalNote {
  id: string;
  title?: string;
  content: string;
  category?: 'دعاوى' | 'تنفيذ' | 'عام';
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

type ExecutionFileRow = {
  id: string;
  external_id: string;
  case_no: string;
  execution_type: string;
  court: string | null;
  execution_basis: string | null;
  encrypted_data: string;
  data_signature: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LawsuitFileRow = {
  id: string;
  external_id: string;
  case_no: string;
  court: string;
  stage: string;
  case_type: string | null;
  parent_id: string | null;
  encrypted_data: string;
  data_signature: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type GlobalNoteRow = {
  id: string;
  external_id: string;
  title: string | null;
  content: string;
  category: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

async function encryptJsonPayload(payload: unknown): Promise<{ encrypted_data: string; data_signature: string }> {
  await CryptoService.initialize();
  const json = JSON.stringify(payload ?? null);
  const encrypted_data = await CryptoService.encryptData(json);
  const data_signature = await CryptoService.generateDataSignature(encrypted_data);
  return { encrypted_data, data_signature };
}

async function decryptJsonPayload(
  encryptedData: string,
  dataSignature?: string | null,
): Promise<unknown> {
  await CryptoService.initialize();
  const signature = String(dataSignature ?? '').trim();
  if (signature) {
    const intact = await CryptoService.verifyDataSignature(encryptedData, signature);
    if (!intact) return null;
  }
  const json = await CryptoService.decryptData(encryptedData);
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

export class SupabaseService {
  public static async checkUserAuth(): Promise<boolean> {
    try {
      if (isShellAuthBypassed()) return true;
      if (isBffAuthEnabled()) {
        const apiState = await probeSameOriginApi();
        if (apiState !== 'available') return false;
        const res = await Promise.race([
          fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          new Promise<Response>((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), 5_000);
          }),
        ]);
        if (!res.ok) return false;
        const body = (await res.json().catch(() => null)) as { user?: { id?: unknown } } | null;
        return typeof body?.user?.id === 'string' && Boolean(body.user.id.trim());
      }

      return await Promise.race([
        supabase.auth.getSession().then(({ data, error }) => !error && !!data.session?.user),
        new Promise<boolean>((resolve) => {
          window.setTimeout(() => resolve(false), 5_000);
        }),
      ]);
    } catch {
      return false;
    }
  }

  static async saveExecutionFile(file: ExecutionFileDTO_Supabase): Promise<string> {
    if (!file?.id || typeof file.id !== 'string') {
      throw new Error('execution_file_id_missing');
    }
    if (!isLiveCloudSyncBucketEnabled('execution')) return file.id;
    const { encrypted_data, data_signature } = await encryptJsonPayload(file);

    const payload = {
      external_id: file.id,
      case_no: file.caseNo,
      execution_type: file.executionType,
      court: file.court ?? null,
      execution_basis: file.executionBasis ?? null,
      encrypted_data,
      data_signature,
      status: file.status ?? 'active',
      security_version: 3,
    };

    await SecureAPIClient.fetchSecure('/api/execution-files/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    scheduleWorkCheckpointAfterCloudWrite();
    return file.id;
  }

  static async getExecutionFiles(): Promise<ExecutionFileDTO_Supabase[]> {
    if (!isLiveCloudSyncBucketEnabled('execution')) return [];
    const res = await SecureAPIClient.fetchSecure<{ ok?: boolean; rows?: ExecutionFileRow[]; error?: string }>(
      '/api/execution-files/list',
      { method: 'GET' },
    );
    if (res && typeof res === 'object' && res.ok === false) {
      throw new Error(
        typeof res.error === 'string' && res.error.trim()
          ? res.error
          : 'execution_files_list_failed',
      );
    }
    const rows = Array.isArray(res.rows) ? res.rows : [];
    const out: ExecutionFileDTO_Supabase[] = [];

    for (const row of rows) {
      const base: ExecutionFileDTO_Supabase = {
        id: row.external_id,
        caseNo: row.case_no,
        executionType: row.execution_type as ExecutionFileDTO_Supabase['executionType'],
        court: row.court ?? '',
        executionBasis: row.execution_basis ?? '',
        creditor: {},
        debtor: {},
        totalAmount: 0,
        status: (row.status ?? 'active') as ExecutionFileDTO_Supabase['status'],
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
      };

      try {
        const decrypted = await decryptJsonPayload(row.encrypted_data, row.data_signature);
        if (isRecord(decrypted)) {
          const merged = { ...base, ...decrypted };
          merged.id = row.external_id;
          merged.caseNo = row.case_no;
          merged.executionType = row.execution_type as ExecutionFileDTO_Supabase['executionType'];
          merged.court = row.court ?? (typeof merged.court === 'string' ? merged.court : '');
          merged.executionBasis =
            row.execution_basis ?? (typeof merged.executionBasis === 'string' ? merged.executionBasis : '');
          merged.status = (row.status ?? merged.status ?? 'active') as ExecutionFileDTO_Supabase['status'];
          merged.createdAt = row.created_at ?? merged.createdAt;
          merged.updatedAt = row.updated_at ?? merged.updatedAt;
          out.push(merged);
        } else {
          out.push({ ...base, decryptIncomplete: true });
        }
      } catch {
        // بيانات وصفية آمنة فقط — لا نخفي الفشل تماماً عن مسار المزامنة
        out.push({ ...base, decryptIncomplete: true });
      }
    }

    return out;
  }

  static async updateExecutionFile(fileId: string, updates: Partial<ExecutionFileDTO_Supabase>): Promise<void> {
    const existing = await this.getExecutionFiles();
    const found = existing.find((f) => f.id === fileId);
    if (!found) throw new Error(`Execution file not found: ${fileId}`);
    await this.saveExecutionFile({
      ...found,
      ...updates,
      id: fileId,
      updatedAt: new Date().toISOString(),
    });
  }

  static async deleteExecutionFile(fileId: string): Promise<void> {
    if (!isLiveCloudSyncBucketEnabled('execution')) return;
    await SecureAPIClient.fetchSecure('/api/execution-files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ external_id: fileId }),
    });
    scheduleWorkCheckpointAfterCloudWrite();
  }

  static async saveLawsuitFile(file: LawsuitFile): Promise<string> {
    if (!file?.id || typeof file.id !== 'string') {
      throw new Error('lawsuit_file_id_missing');
    }
    if (!isLiveCloudSyncBucketEnabled('files')) return file.id;
    const { encrypted_data, data_signature } = await encryptJsonPayload(file);

    const payload = {
      external_id: file.id,
      case_no: file.caseNo,
      court: file.court,
      stage: file.stage,
      case_type: file.caseType ?? null,
      parent_id: file.parentId ?? null,
      encrypted_data,
      data_signature,
      status: file.status ?? 'active',
      security_version: 3,
    };

    await SecureAPIClient.fetchSecure('/api/lawsuit-files/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    scheduleWorkCheckpointAfterCloudWrite();
    return file.id;
  }

  static async deleteLawsuitFile(fileId: string): Promise<void> {
    if (!isLiveCloudSyncBucketEnabled('files')) return;
    await SecureAPIClient.fetchSecure('/api/lawsuit-files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ external_id: fileId }),
    });
    scheduleWorkCheckpointAfterCloudWrite();
  }

  static async getLawsuitFiles(): Promise<LawsuitFile[]> {
    if (!isLiveCloudSyncBucketEnabled('files')) return [];
    const res = await SecureAPIClient.fetchSecure<{
      ok?: boolean;
      rows?: LawsuitFileRow[];
      error?: string;
    }>('/api/lawsuit-files/list', { method: 'GET' });
    if (res && typeof res === 'object' && res.ok === false) {
      throw new Error(res.error?.trim() || 'lawsuit_files_list_failed');
    }
    const rows = Array.isArray(res.rows) ? res.rows : [];
    const out: LawsuitFile[] = [];

    for (const row of rows) {
        const base: LawsuitFile = {
          id: row.external_id,
          caseNo: row.case_no,
          court: row.court,
          stage: row.stage as LawsuitFile['stage'],
          parties: [],
          caseType: row.case_type ?? undefined,
          parentId: row.parent_id ?? undefined,
          status: (row.status ?? 'active') as LawsuitFile['status'],
          createdAt: row.created_at ?? undefined,
          updatedAt: row.updated_at ?? undefined,
        };

        try {
          const decrypted = await decryptJsonPayload(row.encrypted_data, row.data_signature);
          if (isRecord(decrypted)) {
            const merged = { ...base, ...decrypted } as LawsuitFile;
            merged.id = row.external_id;
            merged.caseNo = row.case_no;
            merged.court = row.court;
            merged.stage = row.stage as LawsuitFile['stage'];
            merged.createdAt = row.created_at ?? merged.createdAt;
            merged.updatedAt = row.updated_at ?? merged.updatedAt;
            out.push(merged);
          } else {
            out.push({ ...base, decryptIncomplete: true } as LawsuitFile);
          }
        } catch {
          out.push({ ...base, decryptIncomplete: true } as LawsuitFile);
        }
    }

    return out;
  }

  static async saveGlobalNote(
    note: Omit<GlobalNote, 'id' | 'createdAt' | 'updatedAt'>,
    options?: { id?: string },
  ): Promise<string> {
    const nowIso = new Date().toISOString();
    const noteId = options?.id?.trim() || generateId('note');
    if (!isLiveCloudSyncBucketEnabled('notes')) return noteId;

    const payload = {
      external_id: noteId,
      title: note.title ?? null,
      content: note.content,
      category: note.category ?? null,
      tags: note.tags ?? null,
      updated_at: nowIso,
    };

    await SecureAPIClient.fetchSecure('/api/global-notes/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    scheduleWorkCheckpointAfterCloudWrite();

    return noteId;
  }

  static async getGlobalNotes(): Promise<GlobalNote[]> {
    if (!isLiveCloudSyncBucketEnabled('notes')) return [];
    const res = await SecureAPIClient.fetchSecure<{
      ok?: boolean;
      rows?: GlobalNoteRow[];
      error?: string;
    }>('/api/global-notes/list', { method: 'GET' });
    if (res && typeof res === 'object' && res.ok === false) {
      throw new Error(res.error?.trim() || 'global_notes_list_failed');
    }
    const rows = Array.isArray(res.rows) ? res.rows : [];
    return rows.map((row) => ({
      id: row.external_id,
      title: row.title ?? undefined,
      content: row.content,
      category: (row.category ?? undefined) as GlobalNote['category'] | undefined,
      tags: row.tags ?? undefined,
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    }));
  }

  static async deleteGlobalNote(noteId: string): Promise<void> {
    if (!isLiveCloudSyncBucketEnabled('notes')) return;
    await SecureAPIClient.fetchSecure('/api/global-notes/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ external_id: noteId }),
    });
    scheduleWorkCheckpointAfterCloudWrite();
  }

  static async checkConnection(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/public/readyz', { method: 'GET', headers: { Accept: 'application/json' } });
        if (res.ok) return true;
      }
      const { error } = await supabase.from('kv_store_f09713ba').select('key').limit(1);
      return !error || (error as { code?: string } | null)?.code === 'PGRST116';
    } catch {
      return false;
    }
  }
}
