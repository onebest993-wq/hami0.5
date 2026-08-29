/**

 * تحميل مرحلي للإضبارة الجزائية — store ثم اللوحة.

 * لا تسخين لمحركات cassation/trial أثناء idle بعد الـ store: ذلك يتسابق مع أول فتح.

 * المحركات الثقيلة تُسخَّن عند نية التبويب (lazy registry) أو بعد ظهور القشرة.

 */

type CriminalDashboardModule = typeof import('@/app/components/lawyer/criminal-system/CriminalDashboard');



let criminalModulePromise: Promise<CriminalDashboardModule> | null = null;

let criminalStorePrefetch: Promise<unknown> | null = null;



function prefetchCriminalStore(): Promise<unknown> {

    if (!criminalStorePrefetch) {

        criminalStorePrefetch = import('@/app/components/lawyer/criminal-system/criminalStore')

            .then((mod) => {

                const scheduleLightSlicePrefetch = () => {

                    // أطراف فقط — خفيف ولا يتسابق مع parse أول فتح للمحركات الثقيلة

                    void import('@/app/components/lawyer/criminal-system/criminalDashboardLazyRegistry')

                        .then((m) => {

                            m.prefetchCriminalPartiesGrid();

                        })

                        .catch(() => undefined);

                };

                if (typeof requestIdleCallback !== 'undefined') {

                    requestIdleCallback(scheduleLightSlicePrefetch, { timeout: 4000 });

                } else {

                    window.setTimeout(scheduleLightSlicePrefetch, 1200);

                }

                return mod;

            })

            .catch((err) => {

                criminalStorePrefetch = null;

                throw err;

            });

    }

    return criminalStorePrefetch;

}



function createCriminalModuleImport(): Promise<CriminalDashboardModule> {

    const dashboardImport = import('@/app/components/lawyer/criminal-system/CriminalDashboard');

    const storeImport = prefetchCriminalStore();

    void import('@/app/runtime/deferredFeatureStyles')
        .then((m) => m.ensureDeferredCriminalDossierStylesLoaded())
        .catch(() => undefined);

    return Promise.all([storeImport, dashboardImport])

        .then(([, mod]) => mod)

        .catch((err) => {

            criminalModulePromise = null;

            throw err;

        });

}



export function loadCriminalDashboardModule(): Promise<CriminalDashboardModule> {

    if (!criminalModulePromise) {

        criminalModulePromise = createCriminalModuleImport();

    }

    return criminalModulePromise;

}



export function prefetchCriminalDashboardPhased(): void {

    if (typeof window === 'undefined') return;



    void prefetchCriminalStore().catch(() => undefined);



    const scheduleDashboard = () => {

        if (!criminalModulePromise) {

            criminalModulePromise = createCriminalModuleImport();

        }

        void criminalModulePromise.catch(() => {

            criminalModulePromise = null;

        });

    };



    if (typeof requestIdleCallback !== 'undefined') {

        requestIdleCallback(scheduleDashboard, { timeout: 5000 });

    } else {

        window.setTimeout(scheduleDashboard, 1500);

    }

}



/**

 * تسخين خفيف لمسار Instant (BootChrome + store) —

 * بدون جدولة/تحميل الـ dashboard الكامل. يُستخدم من criminalBootHydrator عند الإقلاع.

 */

export function prefetchCriminalDashboardChromeWarm(): void {

    if (typeof window === 'undefined') return;

    void prefetchCriminalStore().catch(() => undefined);

    void import('@/app/components/lawyer/criminal-system/CriminalDashboardBootChrome').catch(

        () => undefined,

    );

}



if (import.meta.hot) {

    import.meta.hot.dispose(() => {

        criminalModulePromise = null;

        criminalStorePrefetch = null;

    });

}
