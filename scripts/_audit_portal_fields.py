"""Find portal snapshot fields missing from followupSnapshotFieldKeys or core scope."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
portal = (ROOT / 'src/app/components/lawyer/ExecutionDashboard/ExecutionFollowupModalPortal.tsx').read_text(encoding='utf-8')
keys = set(
    re.findall(
        r"'([^']+)'",
        (ROOT / 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts')
        .read_text(encoding='utf-8')
        .split('EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS')[1]
        .split('] as const')[0],
    )
)
destructure = re.search(r'const \{\s*(.*?)\s*\} = useFollowupModal\(\)', portal, re.S)
fields = [f.strip() for f in destructure.group(1).split(',') if f.strip()]
missing_keys = [f for f in fields if f not in keys]
print('portal fields:', len(fields))
print('missing from snapshot keys:', len(missing_keys))
for m in missing_keys:
    print('  -', m)

core = (ROOT / 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts').read_text(encoding='utf-8')
missing_core = []
for f in missing_keys:
    if f not in core and f not in portal:
        missing_core.append(f)
    elif not re.search(rf'\b{re.escape(f)}\b', core):
        missing_core.append(f)
print('missing from core entirely:', missing_core)
