files_to_fix = [
    ('frontend/src/components/ResultModal.tsx', [
        (\"import { EvidenceDropzone, EvidenceDraft } from './EvidenceDropzone';\", \"import { EvidenceDropzone } from './EvidenceDropzone';\\nimport type { EvidenceDraft } from './EvidenceDropzone';\"),
        (\"import { TestCase } from '../types';\", \"import type { TestCase } from '../types';\")
    ]),
    ('frontend/src/context/AuthContext.tsx', [
        (\"import { User } from '../types';\", \"import type { User } from '../types';\"),
        (\"showToast(Bienvenido, );\", \"showToast('Bienvenido, ' + res.user.full_name);\"),
        (\"showToast(Bienvenido, );\", \"showToast('Bienvenido, ' + res.user.full_name);\")
    ]),
    ('frontend/src/pages/AIGeneratorPage.tsx', [
        (\"import { AIGenerateResponse, AIGeneratedCase } from '../types';\", \"import type { AIGenerateResponse, AIGeneratedCase } from '../types';\")
    ]),
    ('frontend/src/pages/DashboardPage.tsx', [
        (\"import { DashboardMetrics, TestCase } from '../types';\", \"import type { DashboardMetrics, TestCase } from '../types';\")
    ]),
    ('frontend/src/pages/ExecuteTestPage.tsx', [
        (\"import { TestCase } from '../types';\", \"import type { TestCase } from '../types';\"),
        (\"import { EvidenceDropzone, EvidenceDraft } from '../components/EvidenceDropzone';\", \"import { EvidenceDropzone } from '../components/EvidenceDropzone';\\nimport type { EvidenceDraft } from '../components/EvidenceDropzone';\")
    ]),
    ('frontend/src/pages/ExecutionsPage.tsx', [
        (\"import { Execution } from '../types';\", \"import type { Execution } from '../types';\")
    ]),
    ('frontend/src/pages/IncidentsPage.tsx', [
        (\"import { Bug, Improvement } from '../types';\", \"import type { Bug, Improvement } from '../types';\")
    ]),
    ('frontend/src/pages/ProjectsPage.tsx', [
        (\"import { Project } from '../types';\", \"import type { Project } from '../types';\")
    ]),
    ('frontend/src/pages/TestCasesPage.tsx', [
        (\"import { TestCase } from '../types';\", \"import type { TestCase } from '../types';\"),
        (\"const [priority, setPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P2');\", \"const [priority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P2');\")
    ])
]

for filepath, replacements in files_to_fix:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    for old, new in replacements:
        text = text.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

print('Type-only imports and unused vars fixed!')
