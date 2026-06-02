/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📝 COMMON TYPES - Type Definitions المركزية
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Central type definitions for the entire application
 * Eliminates 'any' usage and provides strong type safety
 * 
 * @version 3.1.0
 * @author Hami Legal System
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type { LucideIcon };

// ═══════════════════════════════════════════════════════════════════════════
// BASE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface BaseEntity {
    id: string;
    createdAt: string;
    updatedAt?: string;
}

export interface BaseFile extends BaseEntity {
    title: string;
    description?: string;
    status: FileStatus;
    tags?: string[];
}

export type FileStatus = 'active' | 'archived' | 'completed' | 'deleted' | 'pending';

// ═══════════════════════════════════════════════════════════════════════════
// PARTY & ROLE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Party {
    id: string | number;
    name: string;
    role?: PartyRole;
    type?: PartyType;
    isClient?: boolean;
    phone?: string;
    address?: string;
    nationalId?: string;
    birthDate?: string;
    occupation?: string;
    kinship?: string; // V48: Kinship type (زوجة، ابن، etc.)
    linkedDebtorId?: string | number; // V48: Smart kinship linking to debtor
    age?: number; // V48: Age for imprisonment eligibility
}

export type PartyRole = 
    | 'plaintiff' 
    | 'defendant' 
    | 'creditor' 
    | 'debtor'
    | 'witness'
    | 'expert'
    | 'guardian'
    | 'lawyer';

export type PartyType = 'individual' | 'company' | 'government';

// ═══════════════════════════════════════════════════════════════════════════
// CASE FILE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CaseFile extends BaseFile {
    type: CaseType;
    subType?: CaseSubType;
    parties: Party[];
    stages?: Stage[];
    financials?: FinancialData;
    court?: CourtInfo;
    caseNumber?: string;
    filingDate?: string;
}

export type CaseType = 'civil' | 'sharia' | 'criminal' | 'administrative';

export type CaseSubType = 
    | 'urgent' 
    | 'acknowledgment' 
    | 'discovery'
    | 'state_order'
    | 'alimony'
    | 'inheritance'
    | 'divorce'
    | 'custody';

export interface Stage {
    id: string;
    title: string;
    description?: string;
    type: StageType;
    status: StageStatus;
    createdAt: string;
    completedAt?: string;
    timeline?: TimelineEvent[];
    attachments?: Attachment[];
    notes?: string;
}

export type StageType = 
    | 'filing' 
    | 'hearing' 
    | 'judgment' 
    | 'appeal' 
    | 'execution'
    | 'settlement'
    | 'investigation';

export type StageStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface TimelineEvent {
    id: string;
    type: TimelineEventType;
    title: string;
    description?: string;
    date: string;
    author?: string;
    isDeleted?: boolean;
    attachments?: Attachment[];
}

export type TimelineEventType = 
    | 'note' 
    | 'hearing' 
    | 'decision' 
    | 'document' 
    | 'payment'
    | 'notification'
    | 'task';

export interface Attachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url?: string;
    uploadedAt: string;
    uploadedBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION FILE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionArchiveFile extends BaseFile {
    type: ExecutionType;
    directorate: string;
    creditors: Party[];
    debtors: Party[];
    totalAmount: number;
    paidAmount?: number;
    remainingAmount?: number;
    payments?: Payment[];
    assets?: SeizedAsset[];
    notifications?: NotificationRecord[];
    imprisonmentData?: ImprisonmentData;
    /** Optional UI/draft fields used by execution creation wizard (persisted as metadata). */
    claimType?: string;
    chequeBankName?: string;
    chequeIssueDate?: string;
    chequeNumber?: string;
    docNumber?: string;
    foreignData?: Record<string, unknown>;
    shariaDeedNumber?: string;
    shariaRegisterNumber?: string;
    shariaIssueDate?: string;
    shariaIssuingCourt?: string;
    shariaDeedDetails?: string;
    alimony?: unknown;
    monthlyAlimony?: number;
    includesSleepover?: boolean;
    furnitureValue?: number;
    furnitureDetails?: string;
    includeLawyerFees?: boolean;
    lawyerFeesAmount?: number;
    dueDate?: string;
    executionTarget?: string;
    dowryReason?: string;
    guardianshipDetails?: string;
    applicant?: string;
    respondent?: string;
    initiatorRole?: string;
    classification?: string;
    clientFeesAmount?: number;
    creditor?: string | Party;
    debtor?: string | Party;
    fileNumber?: string;
    fileYear?: string | number;
    docType?: string;
    executionBasis?: string;
    relationship?: string;
    linkedDebtor?: string | Party;
}

export type ExecutionType = 'civil' | 'sharia' | 'mutawaa';

export interface Payment {
    id: string;
    amount: number;
    date: string;
    type: PaymentType;
    method?: PaymentMethod;
    notes?: string;
    receipt?: string;
}

export type PaymentType = 'full' | 'partial' | 'installment';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'card';

export interface SeizedAsset {
    id: string;
    type: AssetType;
    description: string;
    estimatedValue: number;
    status: AssetStatus;
    seizureDate: string;
    notes?: string;
}

export type AssetType = 'real_estate' | 'vehicle' | 'bank_account' | 'salary' | 'other';
export type AssetStatus = 'seized' | 'sold' | 'released' | 'pending';

export interface NotificationRecord {
    id: string;
    type: NotificationType;
    recipient: string;
    date: string;
    status: NotificationStatus;
    notes?: string;
}

export type NotificationType = 'initial' | 'reminder' | 'final' | 'execution';
export type NotificationStatus = 'sent' | 'delivered' | 'failed';

export interface ImprisonmentData {
    status: ImprisonmentStatus;
    startDate?: string;
    endDate?: string;
    reason?: string;
    facility?: string;
}

export type ImprisonmentStatus = 'none' | 'pending' | 'active' | 'completed';

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FinancialData {
    totalClaimed: number;
    totalAwarded?: number;
    courtFees?: number;
    lawyerFees?: number;
    expenses?: Expense[];
    payments?: Payment[];
}

export interface Expense {
    id: string;
    type: ExpenseType;
    amount: number;
    date: string;
    description?: string;
    receipt?: string;
}

export type ExpenseType = 
    | 'court_fees' 
    | 'lawyer_fees' 
    | 'expert_fees' 
    | 'travel' 
    | 'documents'
    | 'other';

// ═══════════════════════════════════════════════════════════════════════════
// COURT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CourtInfo {
    name: string;
    type: CourtType;
    location?: string;
    judge?: string;
    caseNumber?: string;
}

export type CourtType = 
    | 'civil' 
    | 'sharia' 
    | 'criminal' 
    | 'administrative'
    | 'appeal'
    | 'cassation';

// ═══════════════════════════════════════════════════════════════════════════
// UI COMPONENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface FileModalProps extends ModalProps {
    file: CaseFile | ExecutionArchiveFile | null;
    onSave: (data: CaseFile | ExecutionArchiveFile) => void;
}

export interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export interface GoldButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    icon?: LucideIcon;
    fullWidth?: boolean;
    variant?: ButtonVariant;
    disabled?: boolean;
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/** للتوافق مع أيقونات SVG عامة؛ لـ lucide استخدم LucideIcon في الواجهات */
export interface IconProps {
    size?: number | string;
    className?: string;
    color?: string;
    strokeWidth?: number | string;
}

export interface AppHeaderProps {
    title: string;
    onBack?: () => void;
    rightIcon?: React.ReactNode;
}

export interface InputFieldProps {
    label?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: InputType;
    icon?: LucideIcon;
    className?: string;
    maxLength?: number;
    disabled?: boolean;
    required?: boolean;
}

export type InputType = 'text' | 'email' | 'password' | 'tel' | 'number' | 'date';

export interface MenuAction {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    color?: string;
    disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ThemeConfig {
    name?: string;
    primary: string;
    secondary: string;
    /** Lawyer dashboard themes use `bg`; other screens may use `background`. */
    background?: string;
    bg?: string;
    text?: string;
    border?: string;
    accent?: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
/** Aligned with `THEMES` keys in `LawyerShared.tsx`. */
export type ThemeKey =
    | 'gold'
    | 'navy'
    | 'crimson'
    | 'emerald'
    | 'black'
    | 'silver'
    | 'sky'
    | 'brown'
    | 'purple'
    | 'bronze';
export type ShapeKey = 'pill' | 'rounded' | 'square' | 'circle';

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** @deprecated Use `AppSettingsState` from `@/app/services/settings` — alias kept for imports. */
export type { AppSettingsState as SettingsState } from '@/app/services/settings/types';

export type Language = 'ar' | 'en';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface HamiSettingsProps {
    onClose: () => void;
    onLogout?: () => void;
    onOpenArchive?: () => void;
    onOpenProfile?: () => void;
    onOpenPrivacy?: () => void;
    onOpenSupport?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// USER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string;
    phone?: string;
    verified?: boolean;
    createdAt: string;
}

export type UserRole = 'lawyer' | 'client' | 'admin';

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface APIResponse<T> {
    data: T;
    error?: string;
    status: APIStatus;
    message?: string;
}

export type APIStatus = 'success' | 'error' | 'loading';

export interface APIError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT HANDLER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ClickEventData {
    id: string;
    action: ClickAction;
    metadata?: Record<string, unknown>;
}

export type ClickAction = 'edit' | 'delete' | 'view' | 'archive' | 'restore' | 'download';

export interface FileUploadData {
    file: File;
    type: string;
    category?: string;
}

export interface SearchEventData {
    query: string;
    filters?: Record<string, unknown>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ═══════════════════════════════════════════════════════════════════════════
// ARCHIVE PORTAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ArchivePortalProps {
    type: ArchiveType;
    files: (CaseFile | ExecutionArchiveFile)[];
    theme: ThemeConfig;
    shapeClass: string;
    onClose: () => void;
    onFileClick: (file: CaseFile | ExecutionArchiveFile) => void;
    onAddAction?: () => void;
    embedded?: boolean;
    hideHeader?: boolean;
    hideTopActionBar?: boolean;
    /** دعاوى نشطة لاستخراج الربط العنقودي عند تثبيت إضبارة تنفيذ */
    lawsuitFilesForCluster?: unknown[];
    /** إضابير جزائية من المخزن */
    criminalCases?: unknown[];
    onOpenCriminalCase?: (caseId: string) => void;
    onDeleteCriminalCase?: (caseId: string) => void;
    /** تبويب اختصاص أولي في مخزن الدعاوى (القضاء المدني / الأحوال الشخصية) */
    initialLawsuitJurisdictionTab?: 'all' | 'civil' | 'personal' | 'criminal';
    /** مخزن التنفيذ: نقل إلى سلة المهملات (حذف ناعم) */
    onMoveExecutionToTrash?: (fileId: string | number) => void;
    /** استرجاع من السلة */
    onRestoreExecutionFromTrash?: (fileId: string | number) => void;
    /** حذف نهائي من السلة (بعد العد التنازلي في الواجهة) */
    onPermanentlyDeleteExecutions?: (fileIds: Array<string | number>) => void;
    /** الدعاوى المدنية: نقل إلى سلة المهملات */
    onMoveLawsuitToTrash?: (fileId: string | number) => void;
    /** استرجاع دعوى من السلة */
    onRestoreLawsuitFromTrash?: (fileId: string | number) => void;
    /** أرشفة دعوى (مخزن الأرشيف) */
    onArchiveLawsuit?: (fileId: string | number) => void;
    /** إعادة دعوى مؤرشفة إلى النشطة */
    onRestoreArchivedLawsuit?: (fileId: string | number) => void;
    /** حذف نهائي لدعاوى من السلة */
    onPermanentlyDeleteLawsuits?: (fileIds: Array<string | number>) => void;
}

export type ArchiveType = 'lawsuits' | 'executions' | 'criminal' | 'all' | 'transaction' | 'deleted';

export interface EnrichedFile extends BaseFile {
    smartStatus: FileSmartStatus;
    stages?: Stage[];
    lastActivity?: string;
    progress?: number;
}

export interface FileSmartStatus {
    label: string;
    color: string;
    icon: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT REQUESTS HUB TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ClientRequestsHubProps {
    onClose: () => void;
    onConvertToCase?: (request: ClientRequest) => void;
}

export interface ClientRequest {
    id: string;
    clientName: string;
    clientPhone?: string;
    type: string;
    description: string;
    urgency: RequestUrgency;
    status: RequestStatus;
    createdAt: string;
    /** ربط سوق المحامين: المستلم المقصود */
    lawyerId?: string;
    /** مبلغ محجوز من محفظة الضمان (عرض وهمي) */
    price?: number;
    requestKind?: 'SOS' | 'Consultation' | 'Service';
    /** لحساب عرض الوقت النسبي عند إعادة التحميل */
    createdAtMs?: number;
}

export type RequestUrgency = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus = 'new' | 'contacting' | 'accepted' | 'rejected' | 'archived';

// ═══════════════════════════════════════════════════════════════════════════
// FORM TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FormField {
    key: string;
    label: string;
    type: FormFieldType;
    required?: boolean;
    placeholder?: string;
    options?: FormFieldOption[];
    validation?: FieldValidation;
}

export type FormFieldType = 
    | 'text' 
    | 'number' 
    | 'date' 
    | 'select' 
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'file';

export interface FormFieldOption {
    value: string;
    label: string;
}

export interface FieldValidation {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Nullable<T> = T | null;

export type ValueOf<T> = T[keyof T];

export type StringKeys<T> = Extract<keyof T, string>;

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════════════════

export type {
    // Re-export for convenience
    React,
};
