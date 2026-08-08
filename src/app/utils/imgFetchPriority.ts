import type { ImgHTMLAttributes } from 'react';

/** React 18 DOM: camelCase `fetchPriority` warns — use lowercase `fetchpriority`. */
export function imgFetchPriorityAttr(
    priority?: ImgHTMLAttributes<HTMLImageElement>['fetchPriority'],
): Pick<ImgHTMLAttributes<HTMLImageElement>, 'fetchpriority'> | undefined {
    if (priority == null) return undefined;
    return { fetchpriority: priority } as Pick<ImgHTMLAttributes<HTMLImageElement>, 'fetchpriority'>;
}
