/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📁 Dossier Lifecycle Utilities - دوال مساعدة لدورة حياة الملف
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * دوال مساعدة للتعامل مع حالات دورة حياة الملف (الإضبارة)
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import type { DossierLifecycleStatus } from '@/app/types/execution';

// ═══════════════════════════════════════════════════════════════════════════
// DOSSIER LIFECYCLE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * إرجاع تسمية حالة دورة حياة الملف باللغة العربية
 */
export function dossierLifecycleLabelAr(status: DossierLifecycleStatus): string {
    const m: Record<DossierLifecycleStatus, string> = {
        active: 'نشطة',
        paused: 'متوقفة',
        suspended: 'مستأخرة',
        finished: 'انتهاء الإضبارة',
    };
    return m[status] ?? status;
}

/** شارة مختصرة — نفس تسميات لوحة الإضبارة */
export function dossierLifecycleBadgeAr(status: DossierLifecycleStatus): string {
    const m: Record<DossierLifecycleStatus, string> = {
        active: '🟢 نشطة',
        paused: '🟡 متوقفة',
        suspended: '⏸️ مستأخرة',
        finished: '🔒 انتهاء الإضبارة',
    };
    return m[status] ?? dossierLifecycleLabelAr(status);
}

export function dossierLifecycleBadgeClass(status: DossierLifecycleStatus): string {
    switch (status) {
        case 'active':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
        case 'paused':
            return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200';
        case 'suspended':
            return 'border-orange-500/30 bg-orange-500/10 text-orange-200';
        case 'finished':
            return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
        default:
            return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    }
}

/**
 * إرجاع كلاس CSS للنص بناءً على حالة دورة حياة الملف
 */
export function dossierLifecycleTriggerTextClass(status: DossierLifecycleStatus): string {
    switch (status) {
        case 'active':
            return 'text-green-400';
        case 'paused':
            return 'text-yellow-400';
        case 'suspended':
            return 'text-orange-400';
        case 'finished':
            return 'text-slate-300';
        default:
            return 'text-slate-300';
    }
}

/**
 * إرجاع كلاس CSS للنقطة (dot) بناءً على حالة دورة حياة الملف
 */
export function dossierLifecycleTriggerDotClass(status: DossierLifecycleStatus): string {
    switch (status) {
        case 'active':
            return 'bg-green-400';
        case 'paused':
            return 'bg-yellow-400';
        case 'suspended':
            return 'bg-orange-400';
        case 'finished':
            return 'bg-slate-400';
        default:
            return 'bg-slate-400';
    }
}