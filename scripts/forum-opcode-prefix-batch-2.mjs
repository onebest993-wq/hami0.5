import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const rules = [
  {
    pattern: /src\/app\/services\/forum\/forumApi\/forumApi(\w+)\.ts$/,
    extractPrefix: (m) => `[forumApi:${m[1].toLowerCase()}:opcode] `,
  },
  {
    pattern: /src\/app\/services\/forum\/forumRepository(DocsDelete|Docs|Comments)?\.ts$/,
    fixedPrefix: '[forumRepo:postgres:opcode] ',
  },
  {
    pattern: /src\/app\/services\/forum\/forum(Follow|Group|Mute|PostFollow)Repository\.ts$/,
    extractPrefix: (m) => `[forumRepo:${m[1].toLowerCase()}:opcode] `,
  },
  {
    pattern: /src\/app\/services\/forum\/ForumNotificationStreamService\.ts$/,
    fixedPrefix: '[forum:stream:http:opcode] ',
  },
  {
    pattern: /src\/app\/services\/forum\/forumPostPersistActions\.ts$/,
    fixedPrefix: '[services_forum:opcode] ',
  },
  {
    pattern: /src\/app\/components\/lawyer\/CommunityScreen\/legalRepositoryCloudSync\.ts$/,
    fixedPrefix: '[community:cloud:opcode] ',
  },
  {
    pattern: /src\/app\/components\/lawyer\/CommunityScreen\/hooks\/runLegalRepositoryUploadSubmit\.ts$/,
    fixedPrefix: '[community:upload:opcode] ',
  },
  {
    pattern: /src\/app\/components\/lawyer\/CommunityScreen\/repositoryStorageService\.ts$/,
    fixedPrefix: '[community:storage:opcode] ',
  },
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

  // PASS 1: string literal without bracket: throw new Error('message')
  const RE_LITERAL = /(throw\s+(?:new\s+)?Error\(\s*)(['"`])(?!\[)/g;
  let out = src.replace(RE_LITERAL, (_, pre, quote) => `${pre}${quote}${prefix}`);
  let occurrences = (src.match(RE_LITERAL) || []).length;

  // PASS 2: dynamic expression: throw new Error(<any non-string-literal>)
  // e.g. throw new Error(error.message)  → throw new Error(prefix + (error.message))
  // Skip if it already starts with a bracket expression like `[forum`
  const RE_DYNAMIC = /throw\s+(?:new\s+)?Error\(\s*(?!['"`\[])([^)]+)\s*\)/g;
  const out2 = out.replace(RE_DYNAMIC, (match, expr) => {
    occurrences += 1;
    return `throw new Error('${prefix}' + (${expr.trim()}))`;
  });

  if (out2 === src) return { changed: false, file: fileRel };
  fs.writeFileSync(abs, out2, 'utf8');
  return { changed: true, file: fileRel, occurrences };
}

const targets = [
  'src/app/services/forum/forumApi/forumApiPosts.ts',
  'src/app/services/forum/forumApi/forumApiComments.ts',
  'src/app/services/forum/forumApi/forumApiGroups.ts',
  'src/app/services/forum/forumApi/forumApiSocial.ts',
  'src/app/services/forum/forumApi/forumApiRepository.ts',
  'src/app/services/forum/forumApi/forumApiClientCore.ts',
  'src/app/services/forum/forumRepository.ts',
  'src/app/services/forum/forumRepositoryDocs.ts',
  'src/app/services/forum/forumRepositoryDocsDelete.ts',
  'src/app/services/forum/forumRepositoryComments.ts',
  'src/app/services/forum/forumFollowRepository.ts',
  'src/app/services/forum/forumGroupRepository.ts',
  'src/app/services/forum/forumMuteRepository.ts',
  'src/app/services/forum/forumPostFollowRepository.ts',
  'src/app/services/forum/ForumNotificationStreamService.ts',
  'src/app/services/forum/forumPostPersistActions.ts',
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
console.log(JSON.stringify({ totalChanged, totalOccurrences, changedList: report.filter(r=>r.changed).map(r=>({f:r.file,n:r.occurrences})) }, null, 2));
