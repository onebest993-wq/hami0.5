/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🗄️ EXECUTION FORM STORE - مخزن نموذج التنفيذ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Zustand store for Execution Creation Form
 * Replaces 69 useState hooks in ExecutionCreationView.tsx
 * 
 * @version 1.0.0
 * @author Hami Legal System
 */

import { create } from 'zustand';
import type { Party, ExecutionFormData } from '@/app/types/execution';
import { executionFormStorageKey } from '@/app/utils/executionStorageKeys';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import SecureStoreService from '@/app/services/SecureStoreService';

interface ExecutionFormState extends ExecutionFormData {
    // Actions
    updateField: <K extends keyof ExecutionFormData>(field: K, value: ExecutionFormData[K]) => void;
    updateParty: (type: 'creditor' | 'debtor', index: number, updates: Partial<Party>) => void;
    addParty: (type: 'creditor' | 'debtor', party: Party) => void;
    removeParty: (type: 'creditor' | 'debtor', index: number) => void;
    resetForm: () => void;
    loadFromLocalStorage: (id: string) => void;
    saveToLocalStorage: (id: string) => void;
    populateFromTemplate: (template: Partial<ExecutionFormData>) => void;
}

/** استيراد يدوي من مفتاح نموذج التنفيذ — يقبل كائناً فقط ويقتطع الحقول المعروفة */
function patchFromSavedFormJson(raw: unknown): Partial<ExecutionFormData> | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const o = raw as Record<string, unknown>;
    const patch: Partial<ExecutionFormData> = {};
    (Object.keys(initialState) as (keyof ExecutionFormData)[]).forEach((k) => {
        if (!(k in o)) return;
        const v = o[k];
        if (k === 'creditors' || k === 'debtors') {
            patch[k] = (Array.isArray(v) ? v : []) as Party[];
        } else {
            (patch as Record<string, unknown>)[k] = v;
        }
    });
    return Object.keys(patch).length > 0 ? patch : null;
}

function createInitialState(): ExecutionFormData {
    return {
        directorate: '',
        fileNumber: '',
        claimType: '',
        documentType: '',
        documentDate: '',
        executionDate: getLocalTodayYmd(),
        
        creditors: [],
        debtors: [],
        
        debtAmount: '',
        currency: 'IQD',
        courtFees: '',
        lawyerFees: '',
        
        alimonyChildrenCount: '',
        alimonyWifeAmount: '',
        alimonyChildAmount: '',
        
        shariaDeedNumber: '',
        shariaRegisterNumber: '',
        shariaIssueDate: '',
        shariaIssuingCourt: '',
        
        paperNumber: '',
        paperIssueDate: '',
        paperDueDate: '',
        paperDrawer: '',
        paperDrawee: '',
    };
}

const initialState: ExecutionFormData = createInitialState();

export const useExecutionFormStore = create<ExecutionFormState>()(
    (set, get) => ({
        ...initialState,

        updateField: (field, value) => set({ [field]: value }),

        updateParty: (type, index, updates) =>
            set((state) => {
                const partyKey = type === 'creditor' ? 'creditors' : 'debtors';
                const parties = [...state[partyKey]];
                const existingParty = parties[index];
                if (existingParty) {
                    parties[index] = { ...existingParty, ...updates };
                }
                return { [partyKey]: parties };
            }),

        addParty: (type, party) =>
            set((state) => {
                const partyKey = type === 'creditor' ? 'creditors' : 'debtors';
                return { [partyKey]: [...state[partyKey], party] };
            }),

        removeParty: (type, index) =>
            set((state) => {
                const partyKey = type === 'creditor' ? 'creditors' : 'debtors';
                const parties = state[partyKey].filter((_, i) => i !== index);
                return { [partyKey]: parties };
            }),

        resetForm: () => set(createInitialState()),

        loadFromLocalStorage: (id) => {
            try {
                const saved = SecureStoreService.getItemSync(executionFormStorageKey(id));
                if (!saved) return;
                const parsed: unknown = JSON.parse(saved);
                const patch = patchFromSavedFormJson(parsed);
                if (!patch) return;
                set((state) => ({ ...state, ...patch }));
            } catch {
                /* ignore */
            }
        },

        saveToLocalStorage: (id) => {
            try {
                const state = get();
                const {
                    updateField,
                    updateParty,
                    addParty,
                    removeParty,
                    resetForm,
                    loadFromLocalStorage,
                    saveToLocalStorage,
                    populateFromTemplate,
                    ...data
                } = state;
                SecureStoreService.setItemSync(executionFormStorageKey(id), JSON.stringify(data));
            } catch {
                /* ignore */
            }
        },

        populateFromTemplate: (template) =>
            set((state) => ({
                ...state,
                ...template,
            })),
    })
);
