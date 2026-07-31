import {
    formatCriminalStageLabel,
    formatInvestigationDepositLocation,
    formatTrialCourtHeaderPrimary,
    hasJuvenileAccused,
} from '@/app/components/lawyer/criminal-system/criminalStagePresentationCore';
import { resolveCaseStageFromRecord } from '@/app/components/lawyer/criminal-system/criminalStageRuntimeCore';

export function criminalCaseReference(c: Record<string, unknown>): { primary: string; secondary: string } {
    const stage = String((c.basics as { stage?: string } | undefined)?.stage ?? '');
    const isInvestigation = stage === 'مرحلة التحقيق';
    const location = (c.location && typeof c.location === 'object' ? c.location : {}) as Record<string, unknown>;
    if (isInvestigation) {
        const primary = formatInvestigationDepositLocation(location) || '—';
        const number =
            String(location.investigationPapersAt ?? '').trim() === 'مكتب تحقيق قضائي'
                ? String(location.investigationDossierNumber ?? '').trim()
                : String(location.baseRegisterNumberAndDate ?? '').trim();
        return { primary, secondary: number || '—' };
    }
    const caseStage = resolveCaseStageFromRecord(c);
    if (caseStage === 'misdemeanor' || caseStage === 'felony') {
        const effectiveCourtName =
            String(location.courtName ?? '').trim() || String(location.investigationCourtName ?? '').trim();
        const primary = formatTrialCourtHeaderPrimary(caseStage, {
            courtName: effectiveCourtName,
            courtCaseNumber: c.courtCaseNumber as string | undefined,
            caseNumber: location.caseNumber as string | undefined,
        });
        return {
            primary,
            secondary: String(c.courtCaseNumber ?? location.caseNumber ?? '').trim() || '—',
        };
    }
    const defs = Array.isArray(c.defendants) ? c.defendants : [];
    return {
        primary:
            String(location.courtName ?? '').trim() ||
            formatCriminalStageLabel(stage, hasJuvenileAccused(defs)) ||
            '—',
        secondary: String(location.caseNumber ?? '').trim() || '—',
    };
}

export function criminalStageBadgeClass(stage: string): string {
    if (stage === 'مرحلة التحقيق') return 'bg-amber-500/15 border-amber-500/30 text-amber-200';
    if (stage === 'محكمة الجنح') return 'bg-blue-500/15 border-blue-500/30 text-blue-200';
    if (stage === 'محكمة الجنايات') return 'bg-red-500/15 border-red-500/30 text-red-200';
    if (stage === 'cassation_court') return 'bg-slate-500/15 border-slate-500/30 text-slate-200';
    return 'bg-white/5 border-white/10 text-white/70';
}

export function criminalStageLabel(stage: string, c: Record<string, unknown>): string {
    const defs = Array.isArray(c.defendants) ? c.defendants : [];
    return formatCriminalStageLabel(stage, hasJuvenileAccused(defs));
}

export function criminalSearchHaystack(c: Record<string, unknown>): string {
    const ref = criminalCaseReference(c);
    const basics = (c.basics && typeof c.basics === 'object' ? c.basics : {}) as Record<string, unknown>;
    const complainants = Array.isArray(c.complainants) ? c.complainants : [];
    const defendants = Array.isArray(c.defendants) ? c.defendants : [];
    const parts = [
        ref.primary,
        ref.secondary,
        String(basics.legalArticle ?? ''),
        String(basics.crimeType ?? ''),
        String(c.notes ?? ''),
        ...complainants.map((p) =>
            p && typeof p === 'object' ? String((p as { fullName?: string; name?: string }).fullName ?? (p as { name?: string }).name ?? '') : '',
        ),
        ...defendants.map((p) =>
            p && typeof p === 'object' ? String((p as { fullName?: string; name?: string }).fullName ?? (p as { name?: string }).name ?? '') : '',
        ),
    ];
    return parts.join(' ').toLowerCase();
}
