import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

export function repositoryCardTypeBadgeClass(type: RepositoryDocument['type']): string {
    switch (type) {
        case 'عقد':
            return 'bg-blue-500/10 border-blue-500/20 text-blue-300';
        case 'قرار حكم':
            return 'bg-purple-500/10 border-purple-500/20 text-purple-300';
        case 'عريضة':
            return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
        case 'بحث قانوني':
            return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
        default:
            return 'bg-gray-500/10 border-gray-500/20 text-gray-300';
    }
}
