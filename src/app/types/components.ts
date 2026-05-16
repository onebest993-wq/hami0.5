/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📝 COMPONENT-SPECIFIC TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Additional type definitions for specific components
 * Complements common.ts with specialized types
 * 
 * @version 3.1.0
 * @author Hami Legal System
 */

import type { ModalProps, CaseFile, Party, Stage } from './common';

// ═══════════════════════════════════════════════════════════════════════════
// LAWYER NEW CASE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LawyerNewCaseProps extends ModalProps {
    onSave: (caseData: CaseFormData) => void;
    initialData?: Partial<CaseFormData>;
}

export interface CaseFormData {
    title: string;
    type: 'civil' | 'sharia';
    subType?: string;
    court?: string;
    caseNumber?: string;
    filingDate?: string;
    parties: Party[];
    description?: string;
    lawyerName?: string;
    lawyerPhone?: string;
}

export interface StageFormData {
    id: string;
    title: string;
    description?: string;
    type: string;
    createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART FILE MODAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SmartFileModalProps extends ModalProps {
    file: CaseFile | null;
    onSave: (updatedFile: CaseFile) => void;
    onDelete?: (fileId: string) => void;
}

export interface FileDisplayData extends CaseFile {
    activeStageIndex: number;
    viewingStageIndex: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY SCREEN TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CommunityScreenProps extends ModalProps {}

export interface LegalQuestion {
    id: string;
    author: string;
    avatar?: string;
    question: string;
    category: string;
    timestamp: string;
    upvotes: number;
    answers: LegalAnswer[];
    aiState: 'idle' | 'researching' | 'answered';
    aiAnswer?: string;
}

export interface LegalAnswer {
    id: string;
    author: string;
    avatar?: string;
    content: string;
    timestamp: string;
    upvotes: number;
    isExpert?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WidgetProps {
    className?: string;
}

export interface DeadlineWidget extends WidgetProps {
    deadlines: DeadlineItem[];
}

export interface DeadlineItem {
    id: string;
    title: string;
    date: string;
    type: 'hearing' | 'filing' | 'appeal';
    daysRemaining: number;
    caseId?: string;
}

export interface FinancialWidgetProps extends WidgetProps {
    totalReceived: number;
    totalPending: number;
    recentTransactions: TransactionItem[];
}

export interface TransactionItem {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    date: string;
    description: string;
    caseId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfirmDialogProps extends ModalProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export interface NotificationModalProps extends ModalProps {
    notifications: NotificationItem[];
    onMarkAsRead?: (id: string) => void;
    onClearAll?: () => void;
}

export interface NotificationItem {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════════════════

export type {
    // Re-export common types for convenience
    ModalProps,
    CaseFile,
    Party,
    Stage,
};
