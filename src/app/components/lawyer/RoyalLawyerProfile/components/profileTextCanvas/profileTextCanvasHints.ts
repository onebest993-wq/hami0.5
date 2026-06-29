import type { ProfileCanvasInteraction } from '@/app/services/profile/profilePageTypes';

export function profileTextCanvasHintText(interaction: ProfileCanvasInteraction): string {
    switch (interaction) {
        case 'luminousFold':
        case 'doorOpen':
        case 'tapReveal':
            return interaction === 'doorOpen' ? 'افتح الباب' : 'لمسة للكشف';
        case 'mistSwipe':
            return 'امسح الضباب';
        case 'stardust':
            return 'مرّر البريق';
        default:
            return '';
    }
}
