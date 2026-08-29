/** مرسل Resend غير الموثَّق — يرفض أي صندوق غير مالك حساب Resend. */
export function isResendTestFromAddress(from: string): boolean {
    return /resend\.dev/i.test(from.trim());
}
