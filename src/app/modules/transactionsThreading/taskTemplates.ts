import { uuidv4 } from '@/app/services/lawyer-cloud';

export type TaskTemplateTask = {
  id: string;
  title: string;
  parentTaskId: string | null;
  deadline: string | null;
};

export type TaskTemplate = {
  id: string;
  name: string;
  createdAt: string;
  tasks: TaskTemplateTask[];
};

const STORAGE_KEY_PREFIX = 'hami:transactions:taskTemplates:v1:';

let memoryFallback: TaskTemplate[] = [];

function safeParseTemplates(raw: string | null): TaskTemplate[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as TaskTemplate[];
  } catch {
    return [];
  }
}

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function readTemplates(userId: string): TaskTemplate[] {
  if (typeof window === 'undefined' || !window?.localStorage) return memoryFallback;
  return safeParseTemplates(window.localStorage.getItem(getStorageKey(userId)));
}

function writeTemplates(userId: string, templates: TaskTemplate[]) {
  if (typeof window === 'undefined' || !window?.localStorage) {
    memoryFallback = templates;
    return;
  }
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(templates));
}

export function listTaskTemplates(userId: string): TaskTemplate[] {
  return readTemplates(userId).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveTaskTemplate(
  userId: string,
  input: { name: string; tasks: Omit<TaskTemplateTask, 'id'>[] } | { name: string; tasks: TaskTemplateTask[] },
) {
  const now = new Date().toISOString();
  const tasks = (input as any).tasks.map((t: any) => ({
    id: t.id ?? uuidv4(),
    title: String(t.title ?? '').trim(),
    parentTaskId: t.parentTaskId ?? null,
    deadline: t.deadline ?? null,
  })) as TaskTemplateTask[];

  const next: TaskTemplate = {
    id: uuidv4(),
    name: input.name.trim() || 'قالب بدون اسم',
    createdAt: now,
    tasks,
  };

  const templates = readTemplates(userId);
  writeTemplates(userId, [next, ...templates]);
  return next;
}

export function deleteTaskTemplate(userId: string, templateId: string) {
  const templates = readTemplates(userId).filter((t) => t.id !== templateId);
  writeTemplates(userId, templates);
}
