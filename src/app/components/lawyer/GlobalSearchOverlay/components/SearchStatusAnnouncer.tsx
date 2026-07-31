import React, { useEffect, useState } from 'react';
import type { GroupedSearchResults } from '@/app/services/globalSearchIndex';

export interface SearchStatusAnnouncerProps {
    showEmptyState: boolean;
    isSearching: boolean;
    isLoadingIndex: boolean;
    query: string;
    results: GroupedSearchResults | null;
}

/** صياغة عربية صحيحة لعدد النتائج (مفرد/مثنى/جمع) */
function formatResultCount(count: number): string {
    if (count === 1) return 'نتيجة واحدة';
    if (count === 2) return 'نتيجتان';
    if (count >= 3 && count <= 10) return `${count} نتائج`;
    return `${count} نتيجة`;
}

function buildStatusMessage({
    showEmptyState,
    isSearching,
    isLoadingIndex,
    query,
    results,
}: SearchStatusAnnouncerProps): string {
    if (showEmptyState) return '';
    if (isSearching || (query.trim() && isLoadingIndex && !results)) return 'جارٍ البحث…';
    if (results?.hasResults) return formatResultCount(results.total);
    if (query.trim()) return `لا نتائج لـ ${query.trim()}`;
    return '';
}

/**
 * منطقة إعلان حيّة لقارئات الشاشة — تعلن حالة البحث (جارٍ/عدد النتائج/لا نتائج)
 * بشكل مهذّب (polite) مع تأخير بسيط لمنع الضجيج أثناء الكتابة السريعة.
 */
export function SearchStatusAnnouncer(props: SearchStatusAnnouncerProps) {
    const { showEmptyState, isSearching, isLoadingIndex, query, results } = props;
    const [message, setMessage] = useState('');

    useEffect(() => {
        const next = buildStatusMessage(props);
        const timer = setTimeout(() => setMessage(next), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showEmptyState, isSearching, isLoadingIndex, query, results]);

    return (
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {message}
        </div>
    );
}
