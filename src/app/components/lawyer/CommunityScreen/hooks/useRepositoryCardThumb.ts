import { useEffect, useRef, useState } from 'react';
import { useInViewOnce } from './useInViewOnce';
import { peekRepositoryThumbUrl, clearRepositoryThumbUrl } from '@/app/services/forum/repositoryThumbUrlCache';
import { resolveRepositoryStorageUrl } from '../repositoryStorageService';

export function useRepositoryCardThumb(
    doc: { id: string; storagePath?: string },
    isImage: boolean,
    priorityThumb: boolean,
) {
    const { ref: cardRef, inView: thumbInView } = useInViewOnce(!isImage || priorityThumb, '280px 0px');
    const thumbRetryRef = useRef(0);
    const cachedThumb = isImage && doc.storagePath ? peekRepositoryThumbUrl(doc.storagePath) : null;
    const [thumbUrl, setThumbUrl] = useState<string | null>(cachedThumb);
    const [thumbLoading, setThumbLoading] = useState(
        isImage && Boolean(doc.storagePath) && !cachedThumb && priorityThumb,
    );

    useEffect(() => {
        thumbRetryRef.current = 0;
    }, [doc.storagePath]);

    useEffect(() => {
        if (!isImage || !doc.storagePath || !thumbInView) {
            if (!isImage || !doc.storagePath) {
                setThumbUrl(null);
                setThumbLoading(false);
            }
            return;
        }

        const cached = peekRepositoryThumbUrl(doc.storagePath);
        if (cached) {
            setThumbUrl(cached);
            setThumbLoading(false);
            return;
        }

        let cancelled = false;
        setThumbLoading(true);
        void resolveRepositoryStorageUrl(doc.storagePath)
            .then((url) => {
                if (!cancelled) setThumbUrl(url);
            })
            .finally(() => {
                if (!cancelled) setThumbLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [doc.id, doc.storagePath, isImage, thumbInView]);

    const retryThumb = () => {
        if (!doc.storagePath) return;
        if (thumbRetryRef.current >= 1) {
            setThumbUrl(null);
            setThumbLoading(false);
            return;
        }
        thumbRetryRef.current += 1;
        clearRepositoryThumbUrl(doc.storagePath);
        setThumbUrl(null);
        setThumbLoading(true);
        void resolveRepositoryStorageUrl(doc.storagePath).then((url) => {
            setThumbUrl(url);
            setThumbLoading(false);
        });
    };

    return { cardRef, thumbUrl, thumbLoading, retryThumb };
}
