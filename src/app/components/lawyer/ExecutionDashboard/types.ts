import type { ExecutionFile } from '@/app/types/execution';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 ExecutionDashboard Types - أنواع لوحة التنفيذ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * تحسين Type Safety لمكون ExecutionDashboard
 * استبدال any بـ types محددة ودقيقة
 * 
 * @version 1.0.0
 * @author Hami Legal System - Type Safety Enhancement
 */

// ═══════════════════════════════════════════════════════════════════════════
// PARTY TYPES (الأطراف)
// ═══════════════════════════════════════════════════════════════════════════

export interface Party {
    id: string | number;
    name: string;
    type?: 'creditor' | 'debtor';
    nationalId?: string;
    phone?: string;
    address?: string;
    age?: number;
    kinship?: string;
    relation?: string; // Alias for kinship - صلة القرابة
    linkedDebtorId?: string | number; // Smart kinship linking to debtor
    occupation?: string;
    isClient?: boolean;
    notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT TYPES (المدفوعات)
// ═══════════════════════════════════════════════════════════════════════════

export interface Payment {
    id: string;
    date: string;
    amount: number;
    method: 'cash' | 'check' | 'bank_transfer';
    receiptNumber?: string;
    notes?: string;
    createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE TYPES (الخط الزمني)
// ═══════════════════════════════════════════════════════════════════════════

export interface TimelineEvent {
    id: string;
    date: string;
    type: 'payment' | 'notification' | 'procedure' | 'court' | 'note';
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    metadata?: Record<string, unknown>;
}

/** صف مدين مختصر يُستخدم في واجهة التنفيذ الموحّدة */
export interface UnifiedExecutionDebtorRow {
    id: string;
    name: string;
    source: 'primary' | 'additional';
    allocated_debt: number;
    paid_amount: number;
    cleared: boolean;
}

export interface ExecutionDashboardProps {
    file?: ExecutionFile;
    executionId?: string;
    onClose: () => void;
    onUpdate?: (data: ExecutionFile) => void;
}

/** مفاتيح بوابة التأكيد المضمنة (Inline Action Gate) */
export type InlineActionGateKey =
    | 'eviction_field_visit'
    | 'eviction_police_force'
    | 'eviction_break_inventory'
    | 'eviction_custodian'
    | 'eviction_forced_eviction'
    | 'seizure_salary'
    | 'seizure_property'
    | 'seizure_vehicle'
    | 'seizure_third_party'
    | 'seizure_notice_mark'
    | 'guarantor_request'
    | 'special_request_submit'
    | 'admin_submit'
    | 'requests_submit';
