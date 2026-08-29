export const COMMENT_ACTION_HIT_AREA =
    "relative touch-manipulation before:absolute before:inset-[-12px] before:content-['']";

export function forumCommentRowIndentClass(depth: number): string {
    if (depth === 0) return '';
    if (depth === 1) return 'mr-8';
    if (depth === 2) return 'mr-16';
    return 'mr-24';
}

export function forumCommentRowThreadClass(depth: number): string {
    return depth === 0 ? '' : 'border-r-2 border-slate-700/50 pr-4';
}
