/** مسارات سبارك الخاصة — خارج workspace: */
export const SPARK_REPOSITORY_SESSION_ROUTE = 'repository:session';

export const SPARK_SPECIAL_NAV_ROUTES = [SPARK_REPOSITORY_SESSION_ROUTE] as const;

export function isSparkSpecialNavRoute(routePath: string): boolean {
    const trimmed = String(routePath ?? '').trim();
    return (SPARK_SPECIAL_NAV_ROUTES as readonly string[]).includes(trimmed);
}
