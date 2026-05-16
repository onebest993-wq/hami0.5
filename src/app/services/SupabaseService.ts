/**
 * SupabaseService — Wrapper مبسط جداً
 *
 * المرحلة الحالية: Deprecation تدريجي.
 * - جميع دوال CRUD تعمل على LocalStorage فقط.
 * - عند تفعيل الجداول الحقيقية في Supabase، سيتم استبدال هذا الملف.
 *
 * @deprecated استخدم SecureStoreService مباشرة للتخزين المحلي.
 */

import { supabase } from '@/app/lib/supabase-client';
import { debug } from '@/app/utils/debug';
import { loadExecutionFilesRaw, saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw, saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { loadGlobalNotesRaw, saveGlobalNotesRaw } from '@/app/utils/globalNotesStorage';

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

export class SupabaseService {
  public static async checkUserAuth(): Promise<boolean> {
    try {
      const result = await Promise.race([
        supabase.auth.getSession().then(({ data, error }) => !error && !!data.session?.user),
        new Promise<boolean>((resolve) => {
          window.setTimeout(() => resolve(false), 5_000);
        }),
      ]);
      return result;
    } catch {
      return false;
    }
  }

  // =====================================================
  // Execution Files — LocalStorage فقط حالياً
  // =====================================================

  static async saveExecutionFile(file: ExecutionFileDTO_Supabase): Promise<string> {
    const fileId = generateId('exec');
    const existing = loadExecutionFilesRaw() as Record<string, unknown>[] || [];
    existing.push({ ...file, id: fileId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    saveExecutionFilesRaw(existing);
    return fileId;
  }

  static async getExecutionFiles(): Promise<ExecutionFileDTO_Supabase[]> {
    try {
      return (loadExecutionFilesRaw() as ExecutionFileDTO_Supabase[]) || [];
    } catch {
      return [];
    }
  }

  static async updateExecutionFile(fileId: string, updates: Partial<ExecutionFileDTO_Supabase>): Promise<void> {
    const existing = loadExecutionFilesRaw() as Record<string, unknown>[] || [];
    const idx = existing.findIndex((f) => isRecord(f) && f.id === fileId);
    if (idx < 0) return;
    existing[idx] = { ...existing[idx], ...updates, updatedAt: new Date().toISOString() };
    saveExecutionFilesRaw(existing);
  }

  static async deleteExecutionFile(fileId: string): Promise<void> {
    const existing = loadExecutionFilesRaw() as Record<string, unknown>[] || [];
    saveExecutionFilesRaw(existing.filter((f) => !(isRecord(f) && f.id === fileId)));
  }

  // =====================================================
  // Lawsuit Files — LocalStorage فقط حالياً
  // =====================================================

  static async saveLawsuitFile(file: LawsuitFile): Promise<string> {
    const fileId = generateId('lawsuit');
    const existing = loadLawsuitFilesRaw() as LawsuitFile[] || [];
    existing.push({ ...file, id: fileId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    saveLawsuitFilesRaw(existing);
    return fileId;
  }

  static async getLawsuitFiles(): Promise<LawsuitFile[]> {
    try {
      return (loadLawsuitFilesRaw() as LawsuitFile[]) || [];
    } catch {
      return [];
    }
  }

  // =====================================================
  // Global Notes — LocalStorage فقط حالياً
  // =====================================================

  static async saveGlobalNote(note: Omit<GlobalNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const noteId = generateId('note');
    const existing = loadGlobalNotesRaw() as GlobalNote[] || [];
    existing.push({ ...note, id: noteId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    saveGlobalNotesRaw(existing);
    return noteId;
  }

  static async getGlobalNotes(): Promise<GlobalNote[]> {
    try {
      return (loadGlobalNotesRaw() as GlobalNote[]) || [];
    } catch {
      return [];
    }
  }

  static async deleteGlobalNote(noteId: string): Promise<void> {
    const existing = loadGlobalNotesRaw() as GlobalNote[] || [];
    saveGlobalNotesRaw(existing.filter((n) => n.id !== noteId));
  }

  // =====================================================
  // Utility
  // =====================================================

  static async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('kv_store_f09713ba').select('key').limit(1);
      return !error || error.code === 'PGRST116';
    } catch {
      return false;
    }
  }
}
