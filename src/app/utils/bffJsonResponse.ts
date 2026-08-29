/**
 * قراءة جسم استجابة JSON بلا رمي — ورقة بلا اعتماديات.
 *
 * كانت ساكنة في `bffAuthClient`، وذاك المحور يستورد `SecureAPIClient` الذي يستورده
 * — دائرة على نواة الشبكة. ونقلُها هنا يُتيح لتوقيع WIFE أن يسكن ورقةً مستقلّة
 * فتُقطع الدائرة بلا نسخ الدالّة في موضعين.
 */

/** الجسم الفاسد أو الفارغ يعود كائناً فارغاً: المتصل يفحص `ok` والحقول لا يُلتقط رمياً */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
    const text = await response.text().catch(() => '');
    try {
        return JSON.parse(text) as T;
    } catch {
        return {} as T;
    }
}
