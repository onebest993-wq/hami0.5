import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useCaseStore = create<CaseState>()(
  persist(
    (set, get): CaseState => ({
      cases: [],
      selectedCaseId: null,
      
      addCase: (newCase) => set((state) => {
        const exists = state.cases.some((c) => c.id === newCase.id);
        if (!exists) {
          try {
            const caseNo = (newCase as { caseNumber?: string }).caseNumber || String(newCase.id);
            const clientName = (newCase as { clientName?: string }).clientName;
            void Promise.all([
              import('@/app/services/auditLogPublisher'),
              import('@/app/domain/lawsuit/lawsuitJurisdiction'),
            ]).then(([{ AuditLog }, { resolveLawsuitJurisdiction }]) => {
              const j = resolveLawsuitJurisdiction(newCase as unknown as Record<string, unknown>);
              if (j === 'personal') {
                AuditLog.personal.caseCreated({ caseId: newCase.id, caseNo, clientName });
              } else {
                AuditLog.civil.caseCreated({ caseId: newCase.id, caseNo, clientName });
              }
            });
          } catch { /* silent */ }
        }
        return { cases: exists ? state.cases : [newCase, ...state.cases] };
      }),
      
      updateCase: (id, updates) => set((state) => {
        const before = state.cases.find((c) => c.id === id);
        const next = state.cases.map((c) => 
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        );
        // Audit log ذكي: ننشر فقط عند تغييرات ذات قيمة (status/currentStage)، لا عند كل تحرير حقل
        if (before) {
          const beforeAny = before as unknown as Record<string, unknown>;
          const updAny = updates as unknown as Record<string, unknown>;
          try {
            void Promise.all([
              import('@/app/services/auditLogPublisher'),
              import('@/app/domain/lawsuit/lawsuitJurisdiction'),
            ]).then(([{ AuditLog }, { resolveLawsuitJurisdiction }]) => {
              const caseNo =
                (beforeAny.caseNumber as string | undefined) || String(before.id);
              const j = resolveLawsuitJurisdiction(beforeAny);
              const isPersonal = j === 'personal';
              if (
                typeof updAny.status === 'string' &&
                updAny.status !== beforeAny.status &&
                updAny.status !== 'deleted'
              ) {
                if (isPersonal) {
                  AuditLog.personal.statusChanged({
                    caseId: before.id,
                    caseNo,
                    fromStatus: String(beforeAny.status ?? ''),
                    toStatus: String(updAny.status),
                  });
                } else {
                  AuditLog.civil.statusChanged({
                    caseId: before.id,
                    caseNo,
                    fromStatus: String(beforeAny.status ?? ''),
                    toStatus: String(updAny.status),
                  });
                }
              }
              if (
                typeof updAny.currentStage === 'string' &&
                updAny.currentStage !== beforeAny.currentStage &&
                beforeAny.currentStage
              ) {
                if (isPersonal) {
                  AuditLog.personal.stageAdvanced({
                    caseId: before.id,
                    caseNo,
                    fromStage: String(beforeAny.currentStage),
                    toStage: String(updAny.currentStage),
                  });
                } else {
                  AuditLog.civil.stageAdvanced({
                    caseId: before.id,
                    caseNo,
                    fromStage: String(beforeAny.currentStage),
                    toStage: String(updAny.currentStage),
                  });
                }
              }
            });
          } catch { /* silent */ }
        }
        return { cases: next };
      }),
      
      deleteCase: (id) => set((state) => {
        const before = state.cases.find((c) => c.id === id);
        if (before && (before as { status?: string }).status !== 'deleted') {
          try {
            const caseNo = (before as { caseNumber?: string }).caseNumber || String(before.id);
            void Promise.all([
              import('@/app/services/auditLogPublisher'),
              import('@/app/domain/lawsuit/lawsuitJurisdiction'),
            ]).then(([{ AuditLog }, { resolveLawsuitJurisdiction }]) => {
              const j = resolveLawsuitJurisdiction(before as unknown as Record<string, unknown>);
              if (j === 'personal') {
                AuditLog.personal.archived({ caseId: before.id, caseNo });
              } else {
                AuditLog.civil.archived({ caseId: before.id, caseNo });
              }
            });
          } catch { /* silent */ }
        }
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
      name: 'legal-cases-storage',
    }
  )
);
