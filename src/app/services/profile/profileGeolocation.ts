import { SmartToast } from '@/app/components/ui/SmartToast';

export type GeolocationPickResult = {
    latitude: number;
    longitude: number;
    label: string;
};

function geolocationErrorMessage(code: number): string {
    switch (code) {
        case 1:
            return 'تم رفض صلاحية الموقع — فعّلها من إعدادات المتصفح أو الجهاز';
        case 2:
            return 'الموقع غير متاح حالياً — جرّب مرة أخرى أو أدخل العنوان يدوياً';
        case 3:
            return 'انتهت مهلة تحديد الموقع — تحقق من GPS أو أدخل العنوان يدوياً';
        default:
            return 'تعذر تحديد الموقع — تحقق من صلاحية الموقع أو أدخل العنوان يدوياً';
    }
}

export function requestCurrentLocationLabel(): Promise<GeolocationPickResult> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('unsupported'));
            return;
        }

        if (typeof window !== 'undefined' && !window.isSecureContext) {
            reject(new Error('insecure'));
            return;
        }

        const onSuccess = (pos: GeolocationPosition) => {
            const { latitude, longitude } = pos.coords;
            resolve({
                latitude,
                longitude,
                label: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
            });
        };

        const tryGet = (highAccuracy: boolean) => {
            navigator.geolocation.getCurrentPosition(
                onSuccess,
                (err) => {
                    if (highAccuracy && (err.code === 2 || err.code === 3)) {
                        tryGet(false);
                        return;
                    }
                    reject(err);
                },
                {
                    enableHighAccuracy: highAccuracy,
                    timeout: highAccuracy ? 14_000 : 20_000,
                    maximumAge: 120_000,
                },
            );
        };

        tryGet(true);
    });
}

export async function pickCurrentLocationForProfile(): Promise<string | null> {
    try {
        const picked = await requestCurrentLocationLabel();
        /* لا toast هنا — المستدعي يتحقق من gen/القناة قبل الإعلان عن النجاح */
        return picked.label;
    } catch (err) {
        if (err instanceof Error && err.message === 'unsupported') {
            SmartToast.error('المتصفح لا يدعم تحديد الموقع — أدخل الإحداثيات أو العنوان يدوياً');
            return null;
        }
        if (err instanceof Error && err.message === 'insecure') {
            SmartToast.error('تحديد الموقع يتطلب اتصالاً آمناً (HTTPS)');
            return null;
        }
        if (typeof err === 'object' && err !== null && 'code' in err) {
            SmartToast.error(geolocationErrorMessage(Number((err as GeolocationPositionError).code)));
            return null;
        }
        SmartToast.error('تعذر تحديد الموقع — تحقق من صلاحية الموقع أو أدخل العنوان يدوياً');
        return null;
    }
}
