import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CASE_STORE_KEY,
  CASE_STORE_PERSIST_VERSION,
  migrateCasePersistState,
  normalizeCasePersistSlice,
} from '@/app/infrastructure/persistence/caseStorePersist';
import { createSecureJSONStorage } from '@/app/services/securePersistStorage';
import { createPersistRehydrateReporter } from '@/app/infrastructure/persistence/zustandPersistFoundation';

export type CaseType = 'lawsuit' | 'transaction' | 'execution';

export interface LinkedDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Deadline {
  id: string;
  title: string;
  date: string;
  isCompleted: boolean;
  relatedHearingId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Hearing {
  id: string;
  date: string;
  title: string;
  notes?: string;
  outcome?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ChecklistItem {
    id: string;
    text: string;
    isChecked: boolean;
    isDeleted?: boolean;
    deletedAt?: string;
}

export interface CaseNote {
  id: string;
  content: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ExecutionDetails {
    totalAmount: number;
    collectedAmount: number;
    notificationDate?: string;
    // derived: remaining = total - collected
}

export interface LegalCase {
  id: string;
  caseNo: string; // Add case number
  title: string;
  type: CaseType;
  court?: string;
  clientName: string;
  opponentName: string;
  
  linkedDocuments: LinkedDocument[];
  deadlines: Deadline[];
  timeline: Hearing[];
  
  // Specific fields
  checklists?: ChecklistItem[]; // For Transactions
  executionDetails?: ExecutionDetails; // For Execution
  notes?: CaseNote[];

  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'completed' | 'deleted';
}

interface CaseState {
  cases: LegalCase[];
  selectedCaseId: string | null;
  addCase: (newCase: LegalCase) => void;
  /** ملء أولي من ملفات الدعاوى — كتابة persist واحدة بدل N استدعاء addCase */
  hydrateCasesFromLawsuitFiles: (mapped: LegalCase[]) => void;
  updateCase: (id: string, updates: Partial<LegalCase>) => void;
  deleteCase: (id: string) => void;
  selectCase: (id: string | null) => void;
  getCase: (id: string) => LegalCase | undefined;
  
  // Specific Actions
  addHearing: (caseId: string, hearing: Hearing) => void;
  addDeadline: (caseId: string, deadline: Deadline) => void;
  addNote: (caseId: string, note: CaseNote) => void;
  toggleChecklist: (caseId: string, itemId: string) => void;
  updateExecution: (caseId: string, details: Partial<ExecutionDetails>) => void;

  // Item Management (Soft Delete / Restore / Hard Delete)
  deleteItem: (caseId: string, type: 'hearing' | 'document' | 'note' | 'checklist', itemId: string) => void;
  restoreItem: (caseId: string, type: 'hearing' | 'document' | 'note' | 'checklist', itemId: string) => void;
  permanentDeleteItem: (caseId: string, type: 'hearing' | 'document' | 'note' | 'checklist', itemId: string) => void;
}

type CasePersisted = Pick<CaseState, 'cases' | 'selectedCaseId'>;

export const useCaseStore = create<CaseState>()(
  persist<CaseState, [], [], CasePersisted>(
    (set, get): CaseState => ({
      cases: [],
      selectedCaseId: null,
      
      addCase: (newCase) => set((state) => {
        const exists = state.cases.some((c) => c.id === newCase.id);
        return { cases: exists ? state.cases : [newCase, ...state.cases] };
      }),

      hydrateCasesFromLawsuitFiles: (mapped) => set((state) => {
        if (state.cases.length > 0 || mapped.length === 0) return state;
        const existingIds = new Set(state.cases.map((c) => c.id));
        const toAdd = mapped.filter((c) => !existingIds.has(c.id));
        if (toAdd.length === 0) return state;
        return { cases: [...toAdd, ...state.cases] };
      }),
      
      updateCase: (id, updates) => set((state) => {
        const next = state.cases.map((c) => 
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        );
        return { cases: next };
      }),
      
      deleteCase: (id) => set((state) => {
        return {
          cases: state.cases.map((c) => 
            c.id === id ? { ...c, status: 'deleted', updatedAt: new Date().toISOString() } : c
          ),
          selectedCaseId: state.selectedCaseId === id ? null : state.selectedCaseId,
        };
      }),
      
      selectCase: (id) => set({ selectedCaseId: id }),
      
      getCase: (id) => get().cases.find((c) => c.id === id),
      
      addHearing: (caseId, hearing) => set((state) => ({
        cases: state.cases.map((c) => 
          c.id === caseId 
            ? { ...c, timeline: [...c.timeline, hearing], updatedAt: new Date().toISOString() } 
            : c
        )
      })),
      
      addDeadline: (caseId, deadline) => set((state) => ({
        cases: state.cases.map((c) => 
          c.id === caseId 
            ? { ...c, deadlines: [...c.deadlines, deadline], updatedAt: new Date().toISOString() } 
            : c
        )
      })),

      addNote: (caseId, note) => set((state) => ({
        cases: state.cases.map((c) => 
          c.id === caseId 
            ? { ...c, notes: [...(c.notes || []), note], updatedAt: new Date().toISOString() } 
            : c
        )
      })),
      
      toggleChecklist: (caseId, itemId) => set((state) => ({
        cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;
            const newChecklists = c.checklists?.map(item => 
                item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
            );
            return { ...c, checklists: newChecklists, updatedAt: new Date().toISOString() };
        })
      })),
      
      updateExecution: (caseId, details) => set((state) => ({
        cases: state.cases.map((c) => 
          c.id === caseId 
            ? { 
                ...c, 
                executionDetails: { ...c.executionDetails, ...details } as ExecutionDetails, 
                updatedAt: new Date().toISOString() 
              } 
            : c
        )
      })),

      deleteItem: (caseId, type, itemId) => set((state) => ({
        cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;
            const updates: Partial<LegalCase> = { updatedAt: new Date().toISOString() };
            const now = new Date().toISOString();
            
            if (type === 'hearing') {
                updates.timeline = c.timeline.map(i => i.id === itemId ? { ...i, isDeleted: true, deletedAt: now } : i);
            } else if (type === 'document') {
                updates.linkedDocuments = c.linkedDocuments.map(i => i.id === itemId ? { ...i, isDeleted: true, deletedAt: now } : i);
            } else if (type === 'note') {
                updates.notes = (c.notes || []).map(i => i.id === itemId ? { ...i, isDeleted: true, deletedAt: now } : i);
            } else if (type === 'checklist') {
                updates.checklists = (c.checklists || []).map(i => i.id === itemId ? { ...i, isDeleted: true, deletedAt: now } : i);
            }
            
            return { ...c, ...updates };
        })
      })),

      restoreItem: (caseId, type, itemId) => set((state) => ({
        cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;
            const updates: Partial<LegalCase> = { updatedAt: new Date().toISOString() };
            
            if (type === 'hearing') {
                updates.timeline = c.timeline.map(i => i.id === itemId ? { ...i, isDeleted: false, deletedAt: undefined } : i);
            } else if (type === 'document') {
                updates.linkedDocuments = c.linkedDocuments.map(i => i.id === itemId ? { ...i, isDeleted: false, deletedAt: undefined } : i);
            } else if (type === 'note') {
                updates.notes = (c.notes || []).map(i => i.id === itemId ? { ...i, isDeleted: false, deletedAt: undefined } : i);
            } else if (type === 'checklist') {
                updates.checklists = (c.checklists || []).map(i => i.id === itemId ? { ...i, isDeleted: false, deletedAt: undefined } : i);
            }
            
            return { ...c, ...updates };
        })
      })),

      permanentDeleteItem: (caseId, type, itemId) => set((state) => ({
        cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;
            const updates: Partial<LegalCase> = { updatedAt: new Date().toISOString() };
            
            if (type === 'hearing') {
                updates.timeline = c.timeline.filter(i => i.id !== itemId);
            } else if (type === 'document') {
                updates.linkedDocuments = c.linkedDocuments.filter(i => i.id !== itemId);
            } else if (type === 'note') {
                updates.notes = (c.notes || []).filter(i => i.id !== itemId);
            } else if (type === 'checklist') {
                updates.checklists = (c.checklists || []).filter(i => i.id !== itemId);
            }
            
            return { ...c, ...updates };
        })
      })),
    }),
    {
      name: CASE_STORE_KEY,
      version: CASE_STORE_PERSIST_VERSION,
      storage: createSecureJSONStorage<CasePersisted>(),
      migrate: migrateCasePersistState,
      merge: (persisted, current) => ({
        ...current,
        ...normalizeCasePersistSlice(persisted),
      }),
      onRehydrateStorage: createPersistRehydrateReporter({
        area: 'case-store',
        storageKey: CASE_STORE_KEY,
        version: CASE_STORE_PERSIST_VERSION,
      }),
    }
  )
);
