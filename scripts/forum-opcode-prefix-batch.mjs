import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const rules = [
  // ===== forumApi/* =====
  {
    pattern: /src\/app\/services\/forum\/forumApi\/forumApi(\w+)\.ts$/,
    extractPrefix: (m) => `[forumApi:${m[1].toLowerCase()}:opcode] `,
  },
  // ===== forumRepository, forumRepositoryDocs, forumRepositoryDocsDelete, forumRepositoryComments =====
  {
    pattern: /src\/app\/services\/forum\/forumRepository(DocsDelete|Docs|Comments)?\.ts$/,
    fixedPrefix: '[forumRepo:postgres:opcode] ',
  },
  // ===== forumFollowRepository, forumGroupRepository, forumMuteRepository, forumPostFollowRepository =====
  {
    pattern: /src\/app\/services\/forum\/forum(Follow|Group|Mute|PostFollow)Repository\.ts$/,
    extractPrefix: (m) => `[forumRepo:${m[1].toLowerCase()}:opcode] `,
  },
  // ===== ForumNotificationStreamService =====
  {
    pattern: /src\/app\/services\/forum\/ForumNotificationStreamService\.ts$/,
    fixedPrefix: '[forum:stream:http:opcode] ',
  },
  // ===== forumPostPersistActions (already has 2, remaining 0) =====
  {
    pattern: /src\/app\/services\/forum\/forumPostPersistActions\.ts$/,
    fixedPrefix: '[services_forum:opcode] ',
  },
  // ===== CommunityScreen legalRepositoryCloudSync =====
  {
    pattern: /src\/app\/components\/lawyer\/CommunityScreen\/legalRepositoryCloudSync\.ts$/,
    fixedPrefix: '[community:cloud:opcode] ',
  },
  // ===== runLegalRepositoryUploadSubmit =====
  {
    pattern: /src\/app\/components\/lawyer\/CommunityScreen\/hooks\/runLegalRepositoryUploadSubmit\.ts$/,
    fixedPrefix: '[community:upload:opcode] ',
  },
  // ===== repositoryStorageService =====
  {
    pattern: /src\/app\/components\/lawyer\/CommunityScreen\/repositoryStorageService\.ts$/,
    fixedPrefix: '[community:storage:opcode] ',
  },
  // ===== useCommunityScreenPostSaves =====
  {
    pattern: /src\/app\/components\/lawyer\/CommunityScreen\/hooks\/useCommunityScreenPostSaves\.ts$/,
    fixedPrefix: '[community:saves:opcode] ',
  },
];

function processFile(fileRel) {
  const abs = path.join(root, fileRel);
  const src = fs.readFileSync(abs, 'utf8');

  let matchedRule = null;
  let prefix = null;
  for (const r of rules) {
    if ('fixedPrefix' in r && r.pattern.test(fileRel)) {
      matchedRule = r;
      prefix = r.fixedPrefix;
      break;
    }
    if ('extractPrefix' in r) {
      const m = fileRel.match(r.pattern);
      if (m) {
        matchedRule = r;
        prefix = r.extractPrefix(m);
        break;
      }
    }
  }
  if (!matchedRule || !prefix) return { changed: false, file: fileRel };

  // We only prefix throw messages that DON'T start with a bracket yet.
  // Pattern: throw new Error('MESSAGE') or throw new Error(`MESSAGE`) or throw Error(...)
  const THROW_RE = /(throw\s+(?:new\s+)?Error\(\s*)(['"`])(?!\[)/g;

  let occurrences = 0;
  const out = src.replace(THROW_RE, (_, pre, quote) => {
    occurrences += 1;
    return `${pre}${quote}${prefix}`;
  });

  if (occurrences === 0 || out === src) return { changed: false, file: fileRel };

  fs.writeFileSync(abs, out, 'utf8');
  return { changed: true, file: fileRel, occurrences };
}

const targets = [
  // forumApi/*
  'src/app/services/forum/forumApi/forumApiPosts.ts',
  'src/app/services/forum/forumApi/forumApiComments.ts',
  'src/app/services/forum/forumApi/forumApiGroups.ts',
  'src/app/services/forum/forumApi/forumApiSocial.ts',
  'src/app/services/forum/forumApi/forumApiRepository.ts',
  'src/app/services/forum/forumApi/forumApiClientCore.ts',
  // forumRepo*
  'src/app/services/forum/forumRepository.ts',
  'src/app/services/forum/forumRepositoryDocs.ts',
  'src/app/services/forum/forumRepositoryDocsDelete.ts',
  'src/app/services/forum/forumRepositoryComments.ts',
  // other repos
  'src/app/services/forum/forumFollowRepository.ts',
  'src/app/services/forum/forumGroupRepository.ts',
  'src/app/services/forum/forumMuteRepository.ts',
  'src/app/services/forum/forumPostFollowRepository.ts',
  // stream & persist
  'src/app/services/forum/ForumNotificationStreamService.ts',
  'src/app/services/forum/forumPostPersistActions.ts',
  // community UI
  'src/app/components/lawyer/CommunityScreen/legalRepositoryCloudSync.ts',
  'src/app/components/lawyer/CommunityScreen/hooks/runLegalRepositoryUploadSubmit.ts',
  'src/app/components/lawyer/CommunityScreen/repositoryStorageService.ts',
  'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenPostSaves.ts',
];

let totalChanged = 0;
let totalOccurrences = 0;
const report = [];
for (const f of targets) {
  const r = processFile(f);
  report.push(r);
  if (r.changed) {
    totalChanged += 1;
    totalOccurrences += r.occurrences;
  }
}
console.log(JSON.stringify({ totalChanged, totalOccurrences, report }, null, 2));
