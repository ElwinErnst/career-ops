---
description: AI job search command center -- show menu, evaluate job description, or sync LinkedIn monitor
---

Career-ops router. Arguments provided: "$ARGUMENTS"

Routing priority:

1. If arguments express intent to import, sync, review, process, or consume jobs from the LinkedIn monitor (examples: "linkedin", "importá las ofertas de LinkedIn", "procesá lo nuevo del monitor", "sincronizá LinkedIn"), execute `linkedin` mode.
2. If arguments contain a job description or URL (keywords like "responsibilities", "requirements", "qualifications", "about the role", "http", "https"), execute auto-pipeline mode.
3. Otherwise, show the discovery menu.

Load the career-ops skill:
```
skill({ name: "career-ops" })
```
