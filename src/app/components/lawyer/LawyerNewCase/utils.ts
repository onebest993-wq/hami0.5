import { BLOCKED_WORDS } from './constants';

export const hasBlockedWord = (text: string): boolean => {
    if (!text) return false;
    return BLOCKED_WORDS.some(word => text.includes(word));
};
