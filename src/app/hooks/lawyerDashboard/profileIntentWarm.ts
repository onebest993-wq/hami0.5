import {
    primeProfileForHover,
    primeProfileForOpen,
} from '@/app/runtime/profileShellPrime';

/** عند hover/لمس الملف المهني — مسار prime موحّد */
export function warmProfileOnHover(userId?: string | null): void {
    primeProfileForHover(userId);
}

/** عند فتح التبويب — مسار prime موحّد (يُستدعى أيضاً من commitProfileOpen) */
export function warmProfileOnOpen(userId?: string | null): void {
    primeProfileForOpen(userId);
}
