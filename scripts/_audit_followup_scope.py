"""Audit followupScopeBag keys vs variables in useExecutionDashboardCore."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
keys_file = ROOT / 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts'
core_file = ROOT / 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts'

keys = re.findall(
    r"'([^']+)'",
    keys_file.read_text(encoding='utf-8').split('EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS')[1].split('] as const')[0],
)
core = core_file.read_text(encoding='utf-8')

bag_start = core.find('const followupScopeBag = {')
bag_end = core.find('};', bag_start)
bag = core[bag_start:bag_end]

in_bag = set(re.findall(r'^\s+(\w+),', bag, re.M))
missing_from_bag = [k for k in keys if k not in in_bag]

# variables that might not exist in hook scope
missing_var = []
for k in in_bag:
    patterns = [
        rf'\bconst\s+{re.escape(k)}\b',
        rf'\blet\s+{re.escape(k)}\b',
        rf'\bfunction\s+{re.escape(k)}\b',
        rf'import\s+\{{[^}}]*\b{re.escape(k)}\b',
        rf'import\s+{re.escape(k)}\b',
        rf'\{{\s*{re.escape(k)}\s*,',
        rf',\s*{re.escape(k)}\s*[,}}]',
    ]
    if k == 'queueMicrotask':
        continue
    if not any(re.search(p, core) for p in patterns):
        missing_var.append(k)

print('snapshot keys:', len(keys))
print('keys in followupScopeBag:', len(in_bag))
print('missing FROM bag:', len(missing_from_bag))
for m in missing_from_bag:
    print('  -', m)
print('in bag but no variable/import in core:', len(missing_var))
for m in missing_var:
    print('  !', m)

# keys in snapshot but not in getScopeSources manual + bag
scope_start = core.find('getScopeSources: () => buildExecutionDashboardChunkScopeSources({')
scope_end = core.find('...pickExecutionFollowupScopeSlice(followupScopeBag)', scope_start)
manual = core[scope_start:scope_end]
manual_keys = set(re.findall(r'^\s+(\w+),', manual, re.M))
all_wired = manual_keys | in_bag
not_wired = [k for k in keys if k not in all_wired]
print('not wired in scope at all:', len(not_wired))
for m in not_wired[:30]:
    print('  ?', m)
if len(not_wired) > 30:
    print('  ...', len(not_wired) - 30, 'more')
