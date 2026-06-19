import { TransactionTaskStatus, type Transaction, type TransactionTask } from '@/app/modules/transactionsThreading/types';

export function generateClientReport(transaction: Transaction, tasks: TransactionTask[]) {
  const done = tasks.filter((t) => t.status === TransactionTaskStatus.Done);
  const active = tasks.filter((t) =>
    t.status === TransactionTaskStatus.Pending ||
    t.status === TransactionTaskStatus.InProgress ||
    t.status === TransactionTaskStatus.Blocked,
  );

  const pick = (arr: TransactionTask[], n: number) => arr.slice(0, n).map((t) => t.title);
  const doneTitles = pick(done, 2);
  const activeTitles = pick(active, 2);

  const doneLine = doneTitles.length > 0 ? `تم إنجاز: ${doneTitles.join('، ')}.` : 'تم إنجاز: لا يوجد حالياً.';
  const activeLine =
    activeTitles.length > 0 ? `نحن الآن في مرحلة: ${activeTitles.join('، ')}.` : 'نحن الآن في مرحلة: لا توجد مهام جارية.';

  return [
    `مرحباً، تحديث بخصوص معاملة ${transaction.title}.`,
    doneLine,
    activeLine,
    'تحياتي، المحامي.',
  ].join('\n');
}

