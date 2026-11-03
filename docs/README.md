# Life Tracker — planning documents

Status: planning complete. Application implementation has not started.

These documents are the source of truth for the product. They were written on 27 October 2026 after inspecting the workspace. The directory was empty and was not a git repository. Nothing in this folder describes code that already exists.

| Document | Purpose |
| --- | --- |
| [01-product-requirements.md](./01-product-requirements.md) | What the product is, who it is for, what the MVP includes, and what it refuses to become |
| [02-technical-architecture.md](./02-technical-architecture.md) | Stack, modules, security, scheduling, offline behavior, and deployment |
| [03-data-model.md](./03-data-model.md) | Entities, relationships, schema, indexes, history, and deletion |
| [04-ux-and-screens.md](./04-ux-and-screens.md) | Screens, navigation, daily workflows, empty and error states |
| [05-implementation-roadmap.md](./05-implementation-roadmap.md) | Phased build order, dependencies, and acceptance criteria |
| [06-testing-and-quality.md](./06-testing-and-quality.md) | Which tests exist because failure would corrupt life records or leak private data |
| [07-task-backlog.md](./07-task-backlog.md) | Ordered implementation tasks and their completion status |

If two documents disagree, use this precedence:

1. Product behavior: document 01.
2. Schema and persistence rules: document 03.
3. Stack, process boundaries, and security controls: document 02.
4. Screen structure: document 04.
5. Build order: document 05, executed through document 07.

Do not start application code until the product owner reviews this set. Implementation begins at `LT-001` in the backlog.
