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
    | 'marital_furniture_delivery'
    | 'eviction_custodian'
    | 'eviction_forced_eviction'
    | 'seizure_salary'
    | 'seizure_property'
    | 'seizure_vehicle'
    | 'seizure_third_party'
    | 'seizure_notice_mark'
    | 'seizure_guarantor_salary'
    | 'seizure_guarantor_property'
    | 'seizure_guarantor_vehicle'
    | 'guarantor_request'
    | 'special_request_submit'
    | 'admin_submit'
    | 'requests_submit'
    | 'encroachment_surveyor_send'
    | 'encroachment_machinery_send'
    | 'specific_delivery_surveyor_send'
    | 'specific_delivery_property_expert_send'
    | 'specific_delivery_movable_valuation_send'
    | 'specific_delivery_conversion_send'
    | 'hidden_pc_forced_bring'
    | 'hidden_pc_travel_ban'
    | 'hidden_pc_arrest'
    | 'hidden_pc_dossier'
    | 'hidden_break_inventory'
    | 'hidden_guarantor_amount'
    | 'hidden_guarantor_salary'
    | 'hidden_guarantor_property'
    | 'hidden_guarantor_movable';
