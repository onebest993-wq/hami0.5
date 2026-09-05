import { useRef, type MutableRefObject } from 'react';
import { useSettingsSectionActive } from './settingsSectionActiveContext';

export function settingsFlowAbandoned(sectionActiveRef: MutableRefObject<boolean>): boolean {
    return !sectionActiveRef.current;
}

export function useSettingsSectionActiveRef(): {
    sectionActive: boolean;
    sectionActiveRef: MutableRefObject<boolean>;
} {
    const sectionActive = useSettingsSectionActive();
    const sectionActiveRef = useRef(sectionActive);
    sectionActiveRef.current = sectionActive;
    return { sectionActive, sectionActiveRef };
}
