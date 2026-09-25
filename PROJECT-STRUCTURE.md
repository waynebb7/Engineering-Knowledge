# Engineering Knowledge Hub — Project Structure

This document describes the folder layout after the June 2026 reorganization. The goal is to separate **learning content**, **calculators**, **reference material**, and **site infrastructure** so the repository is easy to browse and maintain.

## Top-level layout

```
engineering/
├── index.html              # Site hub (home)
├── progress.html           # Learning progress dashboard
├── feedback.html           # Feedback form
│
├── assets/                 # Shared static assets
│   ├── css/                # Stylesheets (corporate.css)
│   └── js/                 # Shared JavaScript
│
├── calculators/            # Interactive calculator pages
│   ├── index.html          # Calculator hub
│   ├── power/
│   ├── ac-circuits/
│   ├── practical/
│   ├── converters/
│   ├── logic/
│   └── tools/
│
├── learn/                  # Teaching / topic pages
│   ├── index.html          # Learning hub
│   ├── mathematics/        # Pure math catalog + topics by level
│   ├── physics/            # Physics catalog + topics by level
│   └── quantum/            # Quantum catalog + topics/
│
├── reference/              # Lookup tables and industry reference
│   ├── electrical/
│   └── industry/
│
├── maps/                   # Prerequisite maps and topic metadata
├── legacy/                 # Older exploratory tools (drill-down explorer)
├── meta/                   # Site metadata (generated subject tree)
│
├── scripts/                # Build, migration, and maintenance scripts
└── docs/                   # Documentation and exports
```

## Folder conventions

### `assets/`

All pages load shared CSS and JS from here:

- `assets/css/corporate.css` — site-wide styles
- `assets/js/site-layout.js` — header, footer, navigation
- `assets/js/calculator-core.js` + `calculator-registry.js` — calculator engine
- `assets/js/topic-progress.js` + `topic-catalog.js` — learning progress tracking

Use **relative paths** from each HTML file to `assets/` (depth varies by folder).

### `calculators/`

Calculator shells are minimal HTML pages with `class="calculator-page"` and `data-calc="…"` on `<body>`. Logic lives in `assets/js/calculator-registry.js`, keyed by `data-calc` (not filename).

| Subfolder      | Purpose                                      |
|----------------|----------------------------------------------|
| `power/`       | DC/AC/three-phase power, power factor, cost  |
| `ac-circuits/` | Ohm's law, impedance, reactance, star/delta  |
| `practical/`   | Motors, cables, transformers, dB, aerospace   |
| `converters/`  | Unit converters, radians, binary/hex         |
| `logic/`       | Truth table generator                        |
| `tools/`       | Utilities (e.g. development roadmap)         |

New calculators: add a shell under the appropriate subfolder, register fields/compute in `calculator-registry.js`, or use `scripts/generate-calculators.ps1`.

### `learn/`

Teaching pages use `class="content-page"` on `<body>`. Each subject catalog is an `index.html` under its subject folder.

**Mathematics** (`learn/mathematics/`):

| Level folder     | Catalog section (approx.)        |
|------------------|----------------------------------|
| `ks2-ks3/`       | Primary / KS2–KS3                |
| `gcse/`          | GCSE                           |
| `a-level/`       | A-Level                        |
| `undergraduate/` | Undergraduate                  |
| `postgraduate/`  | Postgraduate / research        |
| `research/`      | Millennium problems, open research |
| `speculative/`   | Non-standard / AI-only topics  |
| `digital-logic/` | Boolean algebra, gates, K-maps |

**Physics** (`learn/physics/`): same level naming (`ks2-ks3`, `gcse`, `a-level`, `undergraduate`, `postgraduate`, `frontier`, `applied`, `speculative`).

**Quantum** (`learn/quantum/`):

- `index.html` — catalog
- `topics/` — all quantum topic pages

Catalog cross-links use relative paths (e.g. `../mathematics/a-level/vectors.html`).

### `reference/`

- `reference/electrical/variables.html` — engineering variables
- `reference/electrical/equations.html` — equation reference
- `reference/physics/variables.html`, `reference/physics/equations.html`
- `reference/mathematics/variables.html`, `reference/mathematics/equations.html`
- `reference/quantum/variables.html`, `reference/quantum/equations.html`
- `reference/industry/equipment-manufacturers.html` — manufacturer list

### `maps/` and `legacy/`

- `maps/math-prereq-map.html` — mathematics prerequisite graph
- `maps/physics-prereq-map.html` — physics prerequisite graph
- `maps/quantum-prereq-map.html` — quantum prerequisite graph
- `maps/knowledge-graph.html` — read-only lesson network across subjects, with search, filters, and a focused topic view
- `maps/knowledge-graph.json` — generated lesson nodes and required, recommended, and reference connections
- `maps/*-topics.json` — graph source data
- `maps/prereq-node-pages.json` — node ↔ lesson page mapping
- `legacy/physics-drill-down/` — older physics explorer (not in main nav crawl). Loads `topics.json` over HTTP; `topics-data.js` is bundled for `file://` fallback.
- `legacy/math-drill-down/` and `legacy/quantum-drill-down/` — same drill-down explorer pattern for mathematics and quantum.

## URL redirects (backward compatibility)

The migration left **redirect stub HTML files** at old paths (e.g. `dc_power_calculator.html`, `pure_math_subjects.html`, `differentiation.html`). Each stub meta-refreshes to the new location. The full old → new map is in:

```
scripts/path-relocation-map.json
```

To re-run the migration (only on a clean pre-migration tree):

```bash
python scripts/migrate-project-structure.py
```

## Build and maintenance scripts

| Script | Purpose |
|--------|---------|
| `scripts/build-topic-catalog.py` | Regenerate `assets/js/topic-catalog.js` from catalogs |
| `scripts/build-subject-tree.py` | Regenerate `meta/tree.html` from `topic-catalog.json` |
| `scripts/build-topic-progression.py` | Build `scripts/topic-progression.json` (prereqs / next topics) |
| `scripts/build-prereq-node-pages.py` | Map graph nodes → lesson page hrefs (`maps/prereq-node-pages.json`) |
| `scripts/build-prereq-maps.py` | Regenerate `maps/*-prereq-map.html` from topic JSON |
| `scripts/build-knowledge-graph.py` | Build `maps/knowledge-graph.json` from existing lessons and prerequisite data; `--check` verifies the committed output without writing |
| `scripts/apply-catalog-progression.py` | Inject map strip, Pre-requisites, and Next topics cards on lesson pages |
| `scripts/extract-quiz-questions.py` | Extract quiz questions from lesson pages |
| `scripts/build-quiz-answers.py` | Generate `scripts/quiz-answers.json` (optional `sympy` for algebra) |
| `scripts/build-drilldown-explorers.py` | Regenerate all subject drill-down explorers, topic lists, and bundled data |
| `scripts/build-legacy-physics-list.py` | Deprecated wrapper for `build-drilldown-explorers.py` |
| `scripts/ensure-redirect-stubs.py` | Create missing bookmark redirect stubs from `path-relocation-map.json` |
| `scripts/build-vscode-excludes.py` | Regenerate `.vscode/settings.json` to hide redirect stubs in the IDE |
| `scripts/verify-redirect-stubs.py` | Verify redirect stubs point at existing targets |
| `scripts/verify-catalog-links.py` | Verify math/physics/quantum catalog hrefs resolve |
| `scripts/fix-hub-breadcrumbs.py` | Fix “Back to Hub” links after moves |
| `scripts/check-links.py` | Internal link checker (`--scope core` for CI) |
| `scripts/migrate-project-structure.py` | One-time folder reorganization |
| `scripts/export-cursor-transcript.py` | Export agent transcripts to markdown |

Typical refresh after catalog or map edits:

```bash
python scripts/build-topic-catalog.py
python scripts/build-topic-progression.py
python scripts/build-prereq-node-pages.py
python scripts/build-prereq-maps.py
python scripts/build-legacy-physics-list.py
python scripts/apply-catalog-progression.py
python scripts/ensure-redirect-stubs.py
python scripts/build-knowledge-graph.py
python scripts/verify-redirect-stubs.py
python scripts/check-links.py --scope core
```

## Knowledge graph

The knowledge graph is independent of learning progress storage. Its runtime and data load only on the Graph page. Lesson pages receive a **View connections** link from `site-layout.js`; the link passes the site-relative lesson path to `maps/knowledge-graph.html?node=…&view=focus`, including when the site is hosted under `/engineering/`.

The graph reads existing relationships: required and recommended prerequisite connections, plus references from links within lesson content. References do not assert a prerequisite. Rebuild the graph after changing lesson links or prerequisite sources, after the catalog/progression/node mapping builders have run. The graph does not create or edit links in this first version.

## Learning progress

- **Dashboard:** `progress.html`
- **Per-topic widget:** injected on `content-page` bodies via `topic-progress.js`
- **Storage:** browser `localStorage` key `ek-topic-progress`
- **Topic IDs:** paths like `learn/mathematics/a-level/differentiation.html` (matches catalog `href`)

After the reorganization, previously saved progress keyed by old filenames (e.g. `differentiation.html`) will not match new IDs unless manually migrated.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs:

1. `node --check` on `assets/js/*.js`
2. `python -m compileall scripts`
3. Regenerate catalog, progression, prerequisite map, and knowledge graph artifacts — fail if committed files drift
4. Regenerate legacy physics topic list
5. Create and verify backward-compatibility redirect stubs
6. `python scripts/check-links.py --scope core` and `--scope all`

## Adding new content

1. **New math/physics topic:** add HTML under the correct `learn/{subject}/{level}/` folder, add a `<li>` link in the subject `index.html`, regenerate catalog/progression.
2. **New calculator:** add shell under `calculators/{category}/`, register in `calculator-registry.js`.
3. **New reference page:** add under `reference/` and link from the Reference tile on `index.html`.

## Navigation

Main nav is defined in `assets/js/site-layout.js`:

- Home → `index.html` (includes the Reference tile with links to all reference pages)
- Calculators → `calculators/index.html`
- Learn → `learn/index.html` (hub for mathematics, physics, quantum, and digital logic)
- Graph → `maps/knowledge-graph.html` (connected lessons across subjects)
- Documents → `reference/documents/index.html`
- Progress → `progress.html`
- Feedback → `feedback.html`

Contributor quick reference: [docs/CONTRIBUTOR-MAP.md](docs/CONTRIBUTOR-MAP.md)
