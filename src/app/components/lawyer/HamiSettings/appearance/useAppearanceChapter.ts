import { useCallback, useState } from 'react';
import {
    APPEARANCE_CHAPTER_DEFAULT,
    type AppearanceChapterId,
} from './appearanceChapters';

export function useAppearanceChapter() {
    const [openId, setOpenId] = useState<AppearanceChapterId | null>(APPEARANCE_CHAPTER_DEFAULT);

    const toggle = useCallback((id: AppearanceChapterId) => {
        setOpenId((current) => (current === id ? null : id));
    }, []);

    return { openId, toggle };
}
