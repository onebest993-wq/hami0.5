import fs from 'fs';

const src = fs.readFileSync('src/app/components/lawyer/LawyerShared.tsx', 'utf8');
const lines = src.split(/\r?\n/);
const find = (pred) => lines.findIndex(pred);

const legalStart = find((l) => l.includes('LEGAL GRAMMAR ENGINE'));
const themeStart = find((l) => l.includes('THEME & CONFIG'));
const smartStart = find((l) => l.includes('SmartFileModal Types'));
const caseTypeIdx = find((l) => l.startsWith('export type CaseType'));
const fileDataIdx = find((l) => l.startsWith('export interface FileData'));
const partyIdx = find((l) => l.startsWith('export interface Party'));
const alertIdx = find((l) => l.startsWith('export interface Alert'));
const useThemeIdx = find((l) => l.startsWith('export const useThemeStyles'));
const eventTypeIdx = find((l) => l.startsWith('export type EventType'));
const incidentalTypeIdx = find((l) => l.startsWith('export type IncidentalType'));
const notifIdx = find((l) => l.startsWith('export type NotificationStatus'));
const timelineIdx = find((l) => l.startsWith('export interface TimelineEvent'));
const incidentalCaseIdx = find((l) => l.startsWith('export interface IncidentalCase'));
const themeKeyIdx = find((l) => l.startsWith('export type ThemeKey'));
const shapeKeyIdx = find((l) => l.startsWith('export type ShapeKey'));

const out = 'src/app/components/lawyer/lawyerShared';

fs.writeFileSync(
  `${out}/legalRoleLabels.ts`,
  lines.slice(legalStart + 1, themeStart).join('\n').trimEnd() + '\n',
);

const themesOnly = lines
  .slice(themeStart + 1, caseTypeIdx)
  .join('\n')
  .replace(/\n\/\/ --- TYPES ---[\s\S]*$/, '')
  .trim();

const themesFile = `${themesOnly}

export type ThemeKey = keyof typeof THEMES;
export type ShapeKey = keyof typeof SHAPES;

${lines.slice(useThemeIdx, smartStart).join('\n').trim()}
`;
fs.writeFileSync(`${out}/lawyerThemes.ts`, themesFile.trimEnd() + '\n');

const fileDataFile = `import type { CaseStage, TimelineEvent, Task } from './stageTimelineTypes';
import type { IncidentalCase, IncidentalFileLink } from './incidentalTypes';

export type CaseType = 'lawsuit' | 'transaction' | 'execution';

${lines.slice(fileDataIdx, partyIdx).join('\n').trim()}

${lines.slice(partyIdx, alertIdx).join('\n').trim()}

${lines.slice(alertIdx, useThemeIdx).join('\n').trim()}
`;
fs.writeFileSync(`${out}/fileDataTypes.ts`, fileDataFile.trimEnd() + '\n');

const stageFile = `import type { Party, ConsolidationSecondaryRef } from './fileDataTypes';
import type { IncidentalCase } from './incidentalTypes';

${lines.slice(eventTypeIdx, incidentalTypeIdx).join('\n').trim()}

export type NotificationStatus = 'pending' | 'in_person' | 'via_media' | 'publication';

${lines.slice(timelineIdx, incidentalCaseIdx).join('\n').trim()}
`;
fs.writeFileSync(`${out}/stageTimelineTypes.ts`, stageFile.trimEnd() + '\n');

const incidentalFile = `${lines.slice(incidentalTypeIdx, notifIdx).join('\n').trim()}

${lines.slice(incidentalCaseIdx).join('\n').trim()}
`;
fs.writeFileSync(`${out}/incidentalTypes.ts`, incidentalFile.trimEnd() + '\n');

console.log('ok', {
  legal: lines.slice(legalStart + 1, themeStart).length,
  themes: themesFile.split('\n').length,
  fileData: fileDataFile.split('\n').length,
  stage: stageFile.split('\n').length,
  incidental: incidentalFile.split('\n').length,
  unused: { themeKeyIdx, shapeKeyIdx },
});
