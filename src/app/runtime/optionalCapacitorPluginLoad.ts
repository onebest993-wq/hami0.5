/** تحميل plugin Capacitor اختياري دون أن يحلّله Vite عند البناء */
export async function loadOptionalCapacitorPlugin<T>(moduleId: string): Promise<T | null> {
    try {
        const importDynamic = new Function('moduleId', 'return import(moduleId)') as (
            moduleId: string,
        ) => Promise<T>;
        return await importDynamic(moduleId);
    } catch {
        return null;
    }
}
