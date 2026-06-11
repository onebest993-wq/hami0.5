/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 GLOBAL APP STORE - المخزن العام للتطبيق
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Zustand store for global application state
 * Centralizes authentication, navigation, and shared data
 * 
 * @version 1.0.0
 * @author Hami Legal System
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExecutionFile } from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import { createSecureJSONStorage } from '@/app/services/securePersistStorage';

const secureStateStorage = createSecureJSONStorage<Partial<AppState>>();

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type UserRole = 'lawyer' | 'admin' | 'client';

type Screen = 
    | 'auth'
    | 'lawyer'
    | 'admin'
    | 'execution-dashboard'
    | 'execution-creation';

interface User {
    id: string;
    username: string;
    role: UserRole;
    fullName?: string;
    email?: string;
}

interface AppSettings {
    theme: 'dark' | 'light';
    language: 'ar' | 'en';
    notifications: boolean;
    autoSave: boolean;
    compactMode: boolean;
}

interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface AppState {
    // ───────────────────────────────────────────────────────────────────────
    // STATE
    // ───────────────────────────────────────────────────────────────────────
    
    // Authentication
    isAuthenticated: boolean;
    currentUser: User | null;
    
    // Navigation
    currentScreen: Screen;
    previousScreen: Screen | null;
    
    // Data
    executionFiles: ExecutionFile[];
    selectedExecutionId: string | null;
    
    // UI State
    isLoading: boolean;
    isSidebarOpen: boolean;
    settings: AppSettings;
    
    // Notifications
    toasts: ToastMessage[];
    
    // ───────────────────────────────────────────────────────────────────────
    // ACTIONS
    // ───────────────────────────────────────────────────────────────────────
    
    // Authentication
    login: (user: User) => void;
    logout: () => void;
    
    // Navigation
    navigateTo: (screen: Screen) => void;
    goBack: () => void;
    
    // Execution Files
    loadExecutionFiles: () => void;
    addExecutionFile: (file: ExecutionFile) => void;
    updateExecutionFile: (id: string, updates: Partial<ExecutionFile>) => void;
    deleteExecutionFile: (id: string) => void;
    selectExecution: (id: string | null) => void;
    
    // UI State
    setLoading: (loading: boolean) => void;
    toggleSidebar: () => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    
    // Toasts
    showToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
    hideToast: (id: string) => void;
    clearToasts: () => void;
    
    // Utilities
    resetApp: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════

const initialSettings: AppSettings = {
    theme: 'dark',
    language: 'ar',
    notifications: true,
    autoSave: true,
    compactMode: false,
};

// ════════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const useAppStore = create<AppState>()(
    persist(
        (set, _get): AppState => ({
            // ───────────────────────────────────────────────────────────────
            // STATE
            // ───────────────────────────────────────────────────────────────
            
            isAuthenticated: false,
            currentUser: null,
            currentScreen: 'auth',
            previousScreen: null,
            executionFiles: [],
            selectedExecutionId: null,
            isLoading: false,
            isSidebarOpen: true,
            settings: initialSettings,
            toasts: [],
            
            // ───────────────────────────────────────────────────────────────
            // AUTHENTICATION
            // ───────────────────────────────────────────────────────────────
            
            login: (user) => set({
                isAuthenticated: true,
                currentUser: user,
                currentScreen: user.role === 'admin' ? 'admin' : 'lawyer',
            }),
            
            logout: () => set({
                isAuthenticated: false,
                currentUser: null,
                currentScreen: 'auth',
                selectedExecutionId: null,
            }),
            
            // ───────────────────────────────────────────────────────────────
            // NAVIGATION
            // ───────────────────────────────────────────────────────────────
            
            navigateTo: (screen) => set((state) => ({
                currentScreen: screen,
                previousScreen: state.currentScreen,
            })),
            
            goBack: () => set((state) => ({
                currentScreen: state.previousScreen || 'lawyer',
                previousScreen: null,
            })),
            
            // ───────────────────────────────────────────────────────────────
            // EXECUTION FILES
            // ───────────────────────────────────────────────────────────────
            
            loadExecutionFiles: () => {
                try {
                    const stored = SecureStoreService.getItemSync('executionFiles');
                    if (stored) {
                        const files: unknown = JSON.parse(stored);
                        set({
                            executionFiles: Array.isArray(files) ? files : [],
                        });
                    }
                } catch (error) {
                    console.error('Failed to load execution files:', error);
                    set({ executionFiles: [] });
                }
            },
            
            addExecutionFile: (file) => set((state) => {
                const newFiles = [...state.executionFiles, file];
                
                try {
                    SecureStoreService.setItemSync('executionFiles', JSON.stringify(newFiles));
                } catch (error) {
                    console.error('Failed to save execution file:', error);
                }

                // Audit log: نشر حدث "تم إنشاء إضبارة تنفيذ" إلى NotificationStore
                try {
                    const fileRecord = file as {
                        executionCaseNumber?: string;
                        caseNo?: string;
                        fileNumber?: string;
                        fileYear?: string;
                        clientName?: string;
                        creditor?: string;
                    };
                    const fileNo = String(fileRecord.fileNumber ?? '').trim();
                    const fileYear = String(fileRecord.fileYear ?? '').trim();
                    const caseNo =
                        String(fileRecord.executionCaseNumber ?? '').trim() ||
                        String(fileRecord.caseNo ?? '').trim() ||
                        (fileNo && fileYear ? `${fileNo}/${fileYear}` : fileNo) ||
                        undefined;
                    const clientName =
                        String(fileRecord.clientName ?? '').trim() ||
                        String(fileRecord.creditor ?? '').trim() ||
                        undefined;
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        AuditLog.execution.fileCreated({
                            executionId: file.id,
                            caseNo: caseNo ?? 'إضبارة تنفيذ جديدة',
                            clientName,
                        });
                    });
                } catch { /* silent — audit publish is non-critical */ }
                
                return { executionFiles: newFiles };
            }),
            
            updateExecutionFile: (id, updates) => set((state) => {
                const before = state.executionFiles.find((f) => f.id === id);
                const newFiles = state.executionFiles.map((file) =>
                    file.id === id ? { ...file, ...updates } : file
                );
                
                try {
                    SecureStoreService.setItemSync('executionFiles', JSON.stringify(newFiles));
                } catch (error) {
                    console.error('Failed to update execution file:', error);
                }

                // Audit log ذكي: فقط عند تغيير حالات حياتية (lifecycle/status/closure)، ليس عند كل تحرير حقل
                if (before) {
                    const b = before as unknown as Record<string, unknown>;
                    const u = updates as unknown as Record<string, unknown>;
                    try {
                        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                            const bRecord = b as {
                                executionCaseNumber?: string;
                                caseNo?: string;
                                fileNumber?: string;
                                fileYear?: string;
                            };
                            const fileNo = String(bRecord.fileNumber ?? '').trim();
                            const fileYear = String(bRecord.fileYear ?? '').trim();
                            const caseNo =
                                String(bRecord.executionCaseNumber ?? '').trim() ||
                                String(bRecord.caseNo ?? '').trim() ||
                                (fileNo && fileYear ? `${fileNo}/${fileYear}` : fileNo) ||
                                'إضبارة تنفيذ';

                            // إغلاق الإضبارة
                            if (
                                u.dossier_lifecycle_status === 'finished' &&
                                b.dossier_lifecycle_status !== 'finished'
                            ) {
                                AuditLog.execution.closed({ executionId: before.id, caseNo });
                            }
                            // حبس تنفيذي
                            if (
                                typeof u.executive_detention_until === 'string' &&
                                u.executive_detention_until !== b.executive_detention_until
                            ) {
                                AuditLog.execution.detentionOrdered({
                                    executionId: before.id,
                                    caseNo,
                                    untilDate: u.executive_detention_until,
                                });
                            }
                        });
                    } catch { /* silent */ }
                }
                
                return { executionFiles: newFiles };
            }),
            
            deleteExecutionFile: (id) => set((state) => {
                const before = state.executionFiles.find((f) => f.id === id);
                const newFiles = state.executionFiles.filter((file) => file.id !== id);
                if (before) {
                    try {
                        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                            const beforeRecord = before as {
                                executionCaseNumber?: string;
                                caseNo?: string;
                                fileNumber?: string;
                                fileYear?: string;
                            };
                            const fileNo = String(beforeRecord.fileNumber ?? '').trim();
                            const fileYear = String(beforeRecord.fileYear ?? '').trim();
                            const caseNo =
                                String(beforeRecord.executionCaseNumber ?? '').trim() ||
                                String(beforeRecord.caseNo ?? '').trim() ||
                                (fileNo && fileYear ? `${fileNo}/${fileYear}` : fileNo) ||
                                'إضبارة تنفيذ';
                            AuditLog.execution.closed({
                                executionId: before.id,
                                caseNo,
                            });
                        });
                    } catch { /* silent */ }
                }
                
                try {
                    SecureStoreService.setItemSync('executionFiles', JSON.stringify(newFiles));
                } catch (error) {
                    console.error('Failed to delete execution file:', error);
                }
                
                return { executionFiles: newFiles };
            }),
            
            selectExecution: (id) => set({ selectedExecutionId: id }),
            
            // ───────────────────────────────────────────────────────────────
            // UI STATE
            // ───────────────────────────────────────────────────────────────
            
            setLoading: (loading) => set({ isLoading: loading }),
            
            toggleSidebar: () => set((state) => ({ 
                isSidebarOpen: !state.isSidebarOpen 
            })),
            
            updateSettings: (newSettings) => set((state) => ({
                settings: { ...state.settings, ...newSettings }
            })),
            
            // ───────────────────────────────────────────────────────────────
            // TOASTS
            // ───────────────────────────────────────────────────────────────
            
            showToast: (toast) => set((state) => {
                const newToast: ToastMessage = {
                    ...toast,
                    id: `toast-${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                };
                
                const toasts = [...state.toasts, newToast];
                return { toasts: toasts.length > 10 ? toasts.slice(-10) : toasts };
            }),
            
            hideToast: (id) => set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            })),
            
            clearToasts: () => set({ toasts: [] }),
            
            // ───────────────────────────────────────────────────────────────
            // UTILITIES
            // ───────────────────────────────────────────────────────────────
            
            resetApp: () => set({
                isAuthenticated: false,
                currentUser: null,
                currentScreen: 'auth',
                previousScreen: null,
                selectedExecutionId: null,
                isLoading: false,
                toasts: [],
                // Don't reset execution files or settings
            }),
        }),
        {
            name: 'hami-app-storage',
            storage: secureStateStorage,
            // Persist everything except transient state
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                currentUser: state.currentUser,
                currentScreen: state.currentScreen,
                settings: state.settings,
                isSidebarOpen: state.isSidebarOpen,
                // Don't persist: loading, toasts, selected execution
            }),
        }
    )
);

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated;
export const selectCurrentUser = (state: AppState) => state.currentUser;
export const selectCurrentScreen = (state: AppState) => state.currentScreen;
export const selectExecutionFiles = (state: AppState) => state.executionFiles;
export const selectSelectedExecution = (state: AppState) => {
    const { executionFiles, selectedExecutionId } = state;
    if (!selectedExecutionId) return null;
    return executionFiles.find((f) => f.id === selectedExecutionId) || null;
};
export const selectIsLoading = (state: AppState) => state.isLoading;
export const selectSettings = (state: AppState) => state.settings;
export const selectToasts = (state: AppState) => state.toasts;
export const selectIsSidebarOpen = (state: AppState) => state.isSidebarOpen;

// Computed selectors
export const selectExecutionFileById = (id: string) => (state: AppState) => 
    state.executionFiles.find((f) => f.id === id);

export const selectExecutionFilesCount = (state: AppState) => 
    state.executionFiles.length;

export const selectUnpaidExecutions = (state: AppState) =>
    state.executionFiles.filter((f) => {
        const remaining = (f.debtAmount + f.courtFees + f.directorateFees + f.executionFee) -
            (f.paidDebt + f.paidCourtFees + f.paidDirectorateFees);
        return remaining > 0;
    });
