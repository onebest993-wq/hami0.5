import {
  type TransactionTask,
  type TransactionTaskNode,
} from './types';

export function buildTaskTree(flatTasks: TransactionTask[]): TransactionTaskNode[] {
  const nodeById = new Map<string, TransactionTaskNode>();
  for (const task of flatTasks) {
    nodeById.set(task.id, { ...task, children: [] });
  }

  const roots: TransactionTaskNode[] = [];

  const isCycle = (childId: string, parentId: string) => {
    const visited = new Set<string>([childId]);
    let cursor: TransactionTaskNode | undefined = nodeById.get(parentId);
    while (cursor) {
      if (visited.has(cursor.id)) return true;
      visited.add(cursor.id);
      cursor = cursor.parentTaskId ? nodeById.get(cursor.parentTaskId) : undefined;
    }
    return false;
  };

  for (const node of nodeById.values()) {
    if (!node.parentTaskId) {
      roots.push(node);
      continue;
    }

    const parent = nodeById.get(node.parentTaskId);
    if (!parent) {
      roots.push({ ...node, parentTaskId: null });
      continue;
    }

    if (isCycle(node.id, parent.id)) {
      roots.push({ ...node, parentTaskId: null });
      continue;
    }

    parent.children.push(node);
  }

  const sortByCreatedAt = (a: TransactionTaskNode, b: TransactionTaskNode) =>
    a.createdAt.localeCompare(b.createdAt);

  const sortDeep = (nodes: TransactionTaskNode[]) => {
    nodes.sort(sortByCreatedAt);
    for (const n of nodes) sortDeep(n.children);
  };

  sortDeep(roots);
  return roots;
}
