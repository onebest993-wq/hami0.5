import type { CaseStage } from '@/app/types/criminal';

export type JourneyStageTone = {
    border: string;
    bg: string;
    text: string;
    spine: string;
    ring: string;
};

/** ألوان موحّدة للمراحل — مسار الإضبارة + شارات البطاقات. */
export const JOURNEY_STAGE_TONES: Record<CaseStage, JourneyStageTone> = {
    investigation: {
        border: 'border-emerald-500/55',
        bg: 'bg-emerald-500/12',
        text: 'text-emerald-100',
        spine: 'bg-emerald-500/75',
        ring: 'ring-emerald-500/35',
    },
    misdemeanor: {
        border: 'border-sky-500/55',
        bg: 'bg-sky-500/12',
        text: 'text-sky-100',
        spine: 'bg-sky-500/75',
        ring: 'ring-sky-500/35',
    },
    felony: {
        border: 'border-rose-700/60',
        bg: 'bg-rose-950/40',
        text: 'text-rose-100',
        spine: 'bg-rose-600/75',
        ring: 'ring-rose-700/40',
    },
    cassation: {
        border: 'border-violet-500/55',
        bg: 'bg-violet-500/12',
        text: 'text-violet-100',
        spine: 'bg-violet-500/75',
        ring: 'ring-violet-500/35',
    },
    evading_arrest: {
        border: 'border-orange-500/55',
        bg: 'bg-orange-500/12',
        text: 'text-orange-100',
        spine: 'bg-orange-500/75',
        ring: 'ring-orange-500/35',
    },
    absentia_trial: {
        border: 'border-red-800/55',
        bg: 'bg-red-950/35',
        text: 'text-red-100',
        spine: 'bg-red-700/75',
        ring: 'ring-red-800/40',
    },
};

export function journeyStageTone(stage: CaseStage): JourneyStageTone {
    return JOURNEY_STAGE_TONES[stage] ?? JOURNEY_STAGE_TONES.investigation;
}

export function journeyStageCapsuleClass(
    stage: CaseStage,
    opts?: { past?: boolean; intervention?: boolean; selected?: boolean },
): string {
    if (opts?.intervention) {
        return 'border-yellow-400/55 bg-yellow-400/12 text-yellow-100';
    }
    const tone = journeyStageTone(stage);
    if (opts?.past) {
        return `${tone.border} ${tone.bg} ${tone.text} opacity-80 saturate-75`;
    }
    const glow =
        stage === 'misdemeanor'
            ? 'shadow-[0_0_12px_rgba(56,189,248,0.22)]'
            : stage === 'felony'
              ? 'shadow-[0_0_12px_rgba(190,18,60,0.22)]'
              : stage === 'investigation'
                ? 'shadow-[0_0_10px_rgba(16,185,129,0.18)]'
                : '';
    const selectedRing = opts?.selected ? 'ring-1 ring-[#E6C673]/55' : '';
    return `${tone.border} ${tone.bg} ${tone.text} ${glow} ${selectedRing}`.trim();
}

export function journeyStageBadgeClass(stage: CaseStage): string {
    const tone = journeyStageTone(stage);
    return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black whitespace-nowrap ${tone.border} ${tone.bg} ${tone.text}`;
}

export function journeyStageSpineClass(stage: CaseStage): string {
    return `rounded-full ${journeyStageTone(stage).spine}`;
}

export function journeyStageCardAccentClass(stage: CaseStage): string {
    const tone = journeyStageTone(stage);
    return `${tone.border} ${tone.ring}`;
}
