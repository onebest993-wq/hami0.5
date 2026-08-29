/** مهلة تدفق وسائط — كاميرا/ميكروفون. الاسم في الخطأ TimeoutError لرسائل الواجهة. */
export function withMediaStreamTimeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutMessage: string,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(Object.assign(new Error(timeoutMessage), { name: 'TimeoutError' }));
        }, ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}
