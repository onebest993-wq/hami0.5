import { describe, expect, it } from 'vitest';
import { buildTaskTree } from '@/app/modules/transactionsThreading/service';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';

describe('transactionsThreading.buildTaskTree', () => {
  it('builds a nested tree from flat tasks', () => {
    const tasks: TransactionTask[] = [
      {
        id: 'a',
        transactionId: 'tx1',
        title: 'A',
        status: TransactionTaskStatus.Pending,
        parentTaskId: null,
        notes: null,
        deadline: null,
        officialReference: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
      },
      {
        id: 'b',
        transactionId: 'tx1',
        title: 'B',
        status: TransactionTaskStatus.Pending,
        parentTaskId: 'a',
        notes: null,
        deadline: null,
        officialReference: null,
        createdAt: '2026-01-01T00:01:00.000Z',
        completedAt: null,
      },
      {
        id: 'c',
        transactionId: 'tx1',
        title: 'C',
        status: TransactionTaskStatus.Pending,
        parentTaskId: 'b',
        notes: null,
        deadline: null,
        officialReference: null,
        createdAt: '2026-01-01T00:02:00.000Z',
        completedAt: null,
      },
    ];

    const tree = buildTaskTree(tasks);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('a');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('b');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe('c');
  });

  it('treats tasks with missing parent as roots', () => {
    const tasks: TransactionTask[] = [
      {
        id: 'x',
        transactionId: 'tx1',
        title: 'X',
        status: TransactionTaskStatus.Pending,
        parentTaskId: 'missing',
        notes: null,
        deadline: null,
        officialReference: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
      },
    ];

    const tree = buildTaskTree(tasks);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('x');
    expect(tree[0].parentTaskId).toBeNull();
  });
});
