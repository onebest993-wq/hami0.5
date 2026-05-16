/**
 * 🎯 DataService — مستودع بيانات موحّد (معاد توجيهه إلى SecureStoreService)
 * 
 * المرحلة الحالية: Deprecation تدريجي.
 * - جميع العمليات تُعاد توجيهها إلى SecureStoreService ليكون مصدراً وحيداً (SSOT)
 * - عند تفعيل Supabase لاحقاً، يُستبدل هذا الملف بعمليات RLS مباشرة
 * 
 * @deprecated استخدم SecureStoreService مباشرة للتخزين المحلي.
 */

import { supabase } from '@/app/lib/supabase-client';
import SecureStoreService from './SecureStoreService';

const DATA_PREFIX = 'hami:dataservice:';

export interface ExecutionFileDTO_DataService {
  id: string;
  case_no?: string;
  execution_type?: string;
  court?: string;
  execution_basis?: string;
  creditor?: any;
  debtor?: any;
  totalAmount?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface LawsuitFile {
  id: string;
  case_no: string;
  court: string;
  stage: string;
  case_type?: string;
  parent_id?: string;
  parties: any;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

class DataService {
  // === EXECUTION FILES → SecureStoreService ===

  async getExecutionFiles(): Promise<ExecutionFileDTO_DataService[]> {
    try {
      const raw = await SecureStoreService.getItem(`${DATA_PREFIX}execution`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveExecutionFile(file: ExecutionFileDTO_DataService): Promise<void> {
    try {
      const files = await this.getExecutionFiles();
      const idx = files.findIndex(f => f.id === file.id);
      if (idx >= 0) files[idx] = file;
      else files.push(file);
      await SecureStoreService.setItem(`${DATA_PREFIX}execution`, JSON.stringify(files));
    } catch (error) {
      console.error('[DataService] saveExecutionFile failed:', error);
    }
  }

  async deleteExecutionFile(id: string): Promise<void> {
    try {
      const files = await this.getExecutionFiles();
      await SecureStoreService.setItem(`${DATA_PREFIX}execution`, JSON.stringify(files.filter(f => f.id !== id)));
    } catch (error) {
      console.error('[DataService] deleteExecutionFile failed:', error);
    }
  }

  // === LAWSUIT FILES → SecureStoreService ===

  async getLawsuitFiles(): Promise<LawsuitFile[]> {
    try {
      const raw = await SecureStoreService.getItem(`${DATA_PREFIX}lawsuit`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveLawsuitFile(file: LawsuitFile): Promise<void> {
    try {
      const files = await this.getLawsuitFiles();
      const idx = files.findIndex(f => f.id === file.id);
      if (idx >= 0) files[idx] = file;
      else files.push(file);
      await SecureStoreService.setItem(`${DATA_PREFIX}lawsuit`, JSON.stringify(files));
    } catch (error) {
      console.error('[DataService] saveLawsuitFile failed:', error);
    }
  }

  async deleteLawsuitFile(id: string): Promise<void> {
    try {
      const files = await this.getLawsuitFiles();
      await SecureStoreService.setItem(`${DATA_PREFIX}lawsuit`, JSON.stringify(files.filter(f => f.id !== id)));
    } catch (error) {
      console.error('[DataService] deleteLawsuitFile failed:', error);
    }
  }

  getSyncStatus(): { isOnline: boolean; queueLength: number } {
    return { isOnline: true, queueLength: 0 };
  }

  async forceSync(): Promise<void> {
  }

  dispose(): void {
  }
}

const g = globalThis as unknown as { __hamiDataService?: DataService };
export const dataService = g.__hamiDataService ?? (g.__hamiDataService = new DataService());
