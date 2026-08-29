export const APPEARANCE_CHAPTER_IDS = ['theme', 'wallpaper'] as const;

export type AppearanceChapterId = (typeof APPEARANCE_CHAPTER_IDS)[number];

export const APPEARANCE_CHAPTER_DEFAULT: AppearanceChapterId = 'theme';

export const APPEARANCE_CHAPTERS: ReadonlyArray<{
    id: AppearanceChapterId;
    label: string;
    hint: string;
    testId: string;
}> = [
    {
        id: 'theme',
        label: 'الواجهة واللون',
        hint: 'الثيم وتخصيص الأقسام',
        testId: 'appearance-chapter-theme',
    },
    {
        id: 'wallpaper',
        label: 'صورة الخلفية',
        hint: 'خلفية اللوحة',
        testId: 'appearance-chapter-wallpaper',
    },
];
