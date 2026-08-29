export function loadRepositoryIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/repositoryIntentWarm');
}

export function loadRepositoryBootHydrator() {
    return import('@/app/runtime/repositoryBootHydrator');
}

/** Matches repositoryBootHydrator — محلي لتفادي سحب stem عند الاستيراد */
export const REPOSITORY_PRIME_HOST_EVENT = 'hami:repository-prime-host';
