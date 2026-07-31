import React from 'react';

/**
 * هيكل منشورات — بطاقة مرتفعة عن الصفحة (تباين واضح) بلا حدود بيضاء.
 */
function ForumPostCardSkeleton({ index }: { index: number }) {
    return (
        <article
            className="hami-forum-feed-skeleton-card"
            aria-hidden
            data-testid={index === 0 ? 'forum-post-skeleton' : undefined}
            data-forum-skeleton="1"
        >
            <div className="hami-forum-skel-row">
                <div className="hami-forum-skel-avatar hami-forum-skel-pulse" />
                <div className="hami-forum-skel-meta">
                    <div className="hami-forum-skel-line hami-forum-skel-line--name hami-forum-skel-pulse" />
                    <div className="hami-forum-skel-line hami-forum-skel-line--sub hami-forum-skel-pulse" />
                </div>
            </div>
            <div className="hami-forum-skel-body">
                <div className="hami-forum-skel-line hami-forum-skel-line--full hami-forum-skel-pulse" />
                <div className="hami-forum-skel-line hami-forum-skel-line--mid hami-forum-skel-pulse" />
                <div className="hami-forum-skel-line hami-forum-skel-line--short hami-forum-skel-pulse" />
            </div>
            <div className="hami-forum-skel-media hami-forum-skel-pulse" />
            <div className="hami-forum-skel-actions">
                <div className="hami-forum-skel-chip hami-forum-skel-pulse" />
                <div className="hami-forum-skel-chip hami-forum-skel-pulse" />
            </div>
        </article>
    );
}

/** قائمة هياكل منشورات — هندسة مرتفعة واضحة على Android */
export function ForumFeedSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div
            className="hami-forum-feed-skeleton-list"
            data-testid="forum-post-list-skeleton"
            role="status"
            aria-busy="true"
            aria-label="جاري تحميل المنشورات"
        >
            {Array.from({ length: count }, (_, i) => (
                <ForumPostCardSkeleton key={i} index={i} />
            ))}
            <span className="sr-only">جاري تحميل المنشورات</span>
        </div>
    );
}
