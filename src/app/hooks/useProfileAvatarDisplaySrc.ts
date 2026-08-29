import { useEffect, useRef, useState } from 'react';
import {
    PROFILE_AVATAR_DISPLAY_MAX_EDGE_DEFAULT,
    peekProfileAvatarDisplaySrc,
    resolveProfileAvatarDisplaySrc,
    shouldDownscaleProfileAvatarSrc,
} from '@/app/services/profile/resolveProfileAvatarDisplaySrc';

/**
 * يحوّل data: الثقيل إلى blob: مصغّر للعرض.
 * لا يفرّغ Canvas أثناء التحضير — يحتفظ بالصورة السابقة حتى جاهزية التالية.
 */
export function useProfileAvatarDisplaySrc(
    src: string,
    displayMaxEdge: number | false | undefined,
): { displaySrc: string; preparing: boolean } {
    const edge =
        displayMaxEdge === false
            ? 0
            : displayMaxEdge === undefined
              ? shouldDownscaleProfileAvatarSrc(src)
                  ? PROFILE_AVATAR_DISPLAY_MAX_EDGE_DEFAULT
                  : 0
              : displayMaxEdge;

    const needsLite = edge > 0 && shouldDownscaleProfileAvatarSrc(src);
    const cached = needsLite ? peekProfileAvatarDisplaySrc(src, edge) : src;
    const [displaySrc, setDisplaySrc] = useState(() => cached ?? (needsLite ? '' : src));
    const [preparing, setPreparing] = useState(() => needsLite && !cached);
    const lastGoodRef = useRef(displaySrc);

    useEffect(() => {
        let cancelled = false;
        if (!needsLite) {
            setDisplaySrc((prev) => (prev === src ? prev : src));
            lastGoodRef.current = src;
            setPreparing((p) => (p ? false : p));
            return;
        }

        const already = peekProfileAvatarDisplaySrc(src, edge);
        if (already) {
            setDisplaySrc((prev) => (prev === already ? prev : already));
            lastGoodRef.current = already;
            setPreparing((p) => (p ? false : p));
            return;
        }

        /* احتفظ بالإطار السابق — تفريغ src='' كان يُظهر دائرة فارغة ثم Pop-in */
        setPreparing(true);
        void resolveProfileAvatarDisplaySrc(src, edge).then((resolved) => {
            if (cancelled) return;
            setDisplaySrc(resolved);
            lastGoodRef.current = resolved;
            setPreparing(false);
        });

        return () => {
            cancelled = true;
        };
    }, [src, edge, needsLite]);

    const paintSrc = displaySrc || lastGoodRef.current;
    return { displaySrc: paintSrc, preparing: preparing && !paintSrc };
}
