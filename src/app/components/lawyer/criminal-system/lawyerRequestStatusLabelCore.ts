export function formatLawyerRequestStatusLabel(
    status: 'pending' | 'approved' | 'rejected' | 'executed',
): string {
    if (status === 'executed') return 'قرار نافذ / مُنفَّذ';
    if (status === 'approved') return 'تم القبول (موافقة)';
    if (status === 'rejected') return 'تم الرفض';
    return 'قيد النظر';
}

