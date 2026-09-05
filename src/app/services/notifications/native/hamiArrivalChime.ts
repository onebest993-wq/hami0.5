import chime from '@/app/services/notifications/native/hamiArrivalChime.json';

export type HamiArrivalTone = {
    freq: number;
    duration: number;
    gain: number;
    goldFreq?: number;
    goldGain?: number;
};

export const HAMI_ARRIVAL_GAP_SEC: number = chime.gapSec;

export const HAMI_ARRIVAL_TONES: readonly HamiArrivalTone[] = chime.tones as HamiArrivalTone[];
