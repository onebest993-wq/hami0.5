/** آخر يوم في الأسبوع العملي (السبت = 0 … الجمعة = 6) */
export const WORK_WEEK_LAST_OFFSET = 6;

export const WORK_WEEK = [
    { key: 'sat', label: 'السبت', offset: 0 },
    { key: 'sun', label: 'الأحد', offset: 1 },
    { key: 'mon', label: 'الإثنين', offset: 2 },
    { key: 'tue', label: 'الثلاثاء', offset: 3 },
    { key: 'wed', label: 'الأربعاء', offset: 4 },
    { key: 'thu', label: 'الخميس', offset: 5 },
    { key: 'fri', label: 'الجمعة', offset: 6 },
] as const;
