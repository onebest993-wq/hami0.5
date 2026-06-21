export const HAMI_FOCUS_SOVEREIGN_PROMPT = 'hami:focus-sovereign-prompt';

export function focusSovereignPromptInput(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(HAMI_FOCUS_SOVEREIGN_PROMPT));
}
