# Standards Traceability Matrix — Reusable Cursor Prompt

Use this prompt whenever building, extending, or auditing the **Standards Traceability Matrix** across the **Aerospace Engineering Toolkit** within the Engineering Knowledge Hub repository.

---

## 1. Purpose

Establish and maintain a comprehensive **Standards Traceability Matrix** that maps every engineering artefact in the Aerospace Engineering Toolkit back to its authoritative source. The matrix must support engineering review, audit, Design Authority traceability, and future certification activities without altering calculator mathematics or declaring regulatory compliance.

**Primary goals:**

- Ensure every calculator function, document, equation, variable, engineering note, and design guide is traceable to a defined standard or approved engineering basis.
- Provide forward traceability (engineering item → source standard) and reverse traceability (standard → dependent engineering items).
- Offer a searchable **Standards Index** integrated with the existing Document Library.
- Enable export of traceability data into reports, workbooks, and audit packages where supported.
- Maintain alignment with existing Hub architecture, design system, navigation, calculator patterns, and document library conventions.

**Guiding principle:** Traceability supports reviewability and auditability. It is **not** a declaration of compliance unless accepted under the applicable aircraft certification basis and Design Authority process.

---

## 2. Scope

### In scope

- Standards traceability for **all Aerospace Engineering Toolkit** calculators and related content.
- Traceability records for:
  - Calculators (functions, assumptions, outputs, limits)
  - Documents (registered standards, advisories, specifications)
  - Equations (`reference/*/equations.html` and calculator-embedded formulae)
  - Variables (`reference/*/variables.html` and calculator parameter definitions)
  - Engineering notes (help pages, standards reference pages, inline guidance)
  - Design guides (how-to sections, workflow instructions, installation assessment guidance)
- **Standards Index** — canonical catalogue of referenced standards with metadata.
- **Standards Search** — filterable search across the index and traceability records.
- **Traceability Matrix** — forward mapping from engineering items to sources.
- **Reverse Traceability** — inverse mapping from standards/clauses to all dependent items.
- Integration with Document Library, Validation Library, Confidence Rating, and report export where applicable.
- Responsive, accessible presentation on mobile and desktop.

### Supported standard families

The traceability system shall support references to:

| Family | Examples |
|--------|----------|
| **CS-23** | EASA CS-23 (normal-category aeroplanes) |
| **CS-25** | EASA CS-25 (large aeroplanes) |
| **CS-27** | EASA CS-25 (small rotorcraft) |
| **CS-29** | EASA CS-29 (large rotorcraft) |
| **AMC** | Acceptable Means of Compliance / AMC-GM issues |
| **FAA AC** | FAA Advisory Circulars (e.g. AC 43.13-1B, AC 25.981) |
| **RTCA** | DO-160, DO-178, DO-254, and related supplements |
| **SAE** | ARP, AS, and aerospace standards (e.g. ARP4404, AS50881) |
| **MIL Standards** | MIL-STD / MIL-SPEC documents where applicable |
| **Company Standards** | Project-specific, OEM, or operator standards (clearly labelled as such) |

### Out of scope

- Automated compliance determination or certification approval.
- Modification of calculator mathematics when adding traceability metadata.
- Replacement of formal compliance documentation, test evidence, or Design Authority acceptance.

### Reference implementation

Before making changes, review the existing Power Wire Analysis (PWA) traceability pattern:

| Area | Location |
|------|----------|
| Traceability module | `assets/js/pwa-standards-traceability.js` |
| Row data | `assets/js/pwa-standards-traceability-data.json` |
| Static HTML generator | `scripts/gen-traceability-static.js` |
| HTML patch utility | `scripts/patch-traceability-html.js` |
| Fragment templates | `scripts/traceability-tbody.fragment.html`, `scripts/traceability-json.fragment.html` |
| Reference calculator page | `calculators/aerospace-electrical-design/power-wire-analysis.html` |
| Standards reference page | `calculators/aerospace-electrical-design/power-wire-analysis-standards.html` |
| Document Library | `reference/documents/index.html`, `reference/documents/manifest.json` |
| Document manifest build | `scripts/build-documents-manifest.py`, `assets/js/documents-manifest.js` |
| Related modules | `assets/js/pwa-validation-library.js`, `assets/js/pwa-confidence-rating.js` |
| Report integration | `assets/js/pwa-workbook.js`, `assets/js/pwa-word-report.js` |

---

## 3. Functional Requirements

### 3.1 Repository review (mandatory first step)

Before writing or modifying any file:

1. Read `PROJECT-STRUCTURE.md` for folder layout, conventions, and build scripts.
2. Inspect `assets/css/corporate.css` for design tokens and `pwa-standards-traceability` / `pwa-trace-*` component classes.
3. Inspect `assets/js/site-layout.js` for global navigation and breadcrumb patterns.
4. Inspect calculator architecture:
   - Standard calculators: `assets/js/calculator-core.js`, `assets/js/calculator-registry.js`.
   - Aerospace toolkit: modular `assets/js/pwa-*.js`, pages under `calculators/aerospace-electrical-design/`.
5. Inspect document library architecture: `documents-library.js`, `documents-manifest.js`, `reference/documents/manifest.json`.
6. Inspect reference pages: `reference/electrical/equations.html`, `reference/electrical/variables.html`, and equivalent physics/mathematics/quantum pages.
7. Identify existing traceability, validation, and confidence modules on the target calculator before adding new ones.

**Do not introduce parallel patterns** when an established module, data file, generator script, or CSS namespace already exists.

### 3.2 Engineering Knowledge Hub design system

- Load shared styles from `assets/css/corporate.css`.
- Reuse `pwa-standards-traceability`, `pwa-trace-badge`, `pwa-trace-summary`, `pwa-trace-filters`, `pwa-trace-card`, and `pwa-standards-block` patterns.
- Use existing CSS variables and spacing; add new styles only when no suitable class exists.
- Match typography, colour, and collapsible `<details>`/`<summary>` patterns to adjacent calculator sections.

### 3.3 Navigation and styling conventions

- Include `site-layout.js`; do not duplicate global navigation.
- Use relative asset paths appropriate to page depth.
- Provide contextual `back-link` and `pwa-subnav` for multi-page aerospace calculator sections.
- Link Standards Index entries to Document Library tiles where files are registered.
- Preserve hub links to **Engineering Knowledge Hub** (`index.html`).

### 3.4 Standards Index

Create and maintain a canonical **Standards Index** that:

- Lists every standard referenced anywhere in the Aerospace Engineering Toolkit.
- Groups standards by family (CS-23, CS-25, CS-27, CS-29, AMC, FAA AC, RTCA, SAE, MIL, Company).
- Records for each standard: designation, title, revision, issuing body, Document Library ID (if registered), and applicability summary.
- Cross-links to `reference/documents/index.html` for downloadable registered documents.
- Serves as the authoritative lookup table for traceability row `standard` and `revision` fields.
- Is stored as structured JSON (e.g. `assets/js/standards-index.json`) with a generated embed or dedicated index page under `reference/` or `calculators/aerospace-electrical-design/`.

### 3.5 Standards Search

Provide **Standards Search** capability that:

- Searches across the Standards Index and all traceability records.
- Supports filtering by standard family, reference type, traceability level, aircraft category applicability, and calculator/tool.
- Uses the existing filter pattern from `pwa-standards-traceability.js` (`level`, `referenceType`, free-text `search`).
- Returns matching standards, clauses, and linked engineering items.
- Works on mobile and desktop; tables scroll within containers on narrow viewports.
- Includes `<noscript>` static fallback listing indexed standards.

### 3.6 Traceability Matrix (forward traceability)

Build a **Traceability Matrix** that maps each engineering item to its source:

| Engineering item type | Examples |
|-----------------------|----------|
| Calculator function | Wire gauge selection, voltage drop calculation, bundle derating |
| Document | Registered PDF in Document Library cited by a calculator |
| Equation | \( P = V \times I \), ARP4404 thermal formulae |
| Variable | AWG, T₂, ambient temperature, altitude |
| Engineering note | Inline help text, parameter tooltips, disclaimer paragraphs |
| Design guide | How-to workflow, installation assessment procedure |

For each row, display at minimum:

- Engineering item name and description (what it does)
- Standard
- Clause
- Revision
- Applicability
- Compliance Notes
- Traceability level (A–E per existing legend)
- Reference type badge
- User action required (where applicable)

Follow the existing row schema in `pwa-standards-traceability-data.json` and extend with `standard`, `clause`, `revision`, `applicability`, and `complianceNotes` fields as first-class properties (map `primaryReference` → `standard` where consolidating).

### 3.7 Reverse Traceability

Implement **Reverse Traceability** so that selecting a standard or clause reveals all dependent engineering items:

- Given a **Standard** (e.g. SAE ARP4404C), list every calculator function, equation, variable, note, and guide that references it.
- Given a **Clause** (e.g. Table 3, §25.1309), list all items citing that clause.
- Link reverse-trace results back to the source page (calculator, equation row, document tile, help section).
- Present reverse-trace views as filterable tables and/or card layouts using existing `pwa-trace-card` patterns.
- Build reverse indexes at data layer (derived from traceability JSON) rather than maintaining duplicate manual records.

### 3.8 Traceability level legend (required)

Retain and display the established A–E legend:

| Level | Meaning |
|-------|---------|
| **A** | Directly standards-based |
| **B** | Derived from recognised aerospace practice |
| **C** | Engineering model / physics-based estimate |
| **D** | Conservative assumption requiring Design Authority acceptance |
| **E** | Requires test, inspection or project-specific validation |

### 3.9 Integration requirements

- **Document Library:** Cite registered documents by manifest `id`; prefer on-repo files in `reference/documents/files/`.
- **Validation Library:** Cross-reference validation case source standards with traceability rows; avoid contradictory references.
- **Confidence Rating:** Note where traceability level affects confidence assessment.
- **Report export:** Expose `getExportData()` / `buildTraceabilityReportSection()` pattern for Word and workbook export.
- **Static fallback:** Embed JSON in HTML via `<script type="application/json" id="…-standards-traceability-data">`; regenerate static fragments with `node scripts/gen-traceability-static.js`.

### 3.10 Responsive design and accessibility

- **Mobile compatibility** — usable at ≥ 320px; touch-friendly controls; stacked filters.
- **Desktop compatibility** — summary cards, full table, and reverse-trace panels readable at wide breakpoints.
- **Responsive design** — table horizontal scroll in containers; card layout fallback on narrow screens (existing `pwa-trace-cards` pattern).
- **Accessibility** — semantic tables with `<th scope>`, `aria-label` on filters, `aria-live` on search results, `role="note"` on disclaimers, keyboard-operable controls, sufficient contrast.

### 3.11 Disclaimers (required)

Display visible warnings stating:

- Standards references are provided for engineering traceability.
- Clause applicability depends on aircraft category, modification status, certification basis, customer requirements, and Design Authority interpretation.
- The traceability matrix is not a declaration of compliance unless accepted under the applicable certification basis.

---

## 4. Traceability Requirements

### 4.1 Universal coverage rule

**Every** calculator, document, equation, variable, engineering note, and design guide in the Aerospace Engineering Toolkit scope shall have at least one traceability record linking it to an authoritative source or an explicitly declared engineering basis (levels C, D, or E with justification).

### 4.2 Required fields per engineering item

| Field | Description |
|-------|-------------|
| **Standard** | Full designation of the source (e.g. `EASA CS-25`, `SAE ARP4404C`, `RTCA DO-160G`, `FAA AC 43.13-1B`, `Company STD-EWIS-001`). Use `Company Standards` prefix for project-specific documents. |
| **Clause** | Specific section, table, paragraph, figure, or AMC/GM item (e.g. `CS 25.1309`, `ARP4404 Table 3`, `DO-160 Section 4`). Use `TBD — Design Authority` when clause is not yet confirmed. |
| **Revision** | Issue, amendment, or edition (e.g. `Amendment 24`, `Issue C`, `Rev G`). Align with Document Library `revision` / `label` where registered. |
| **Applicability** | Aircraft category, system, installation context, or operational condition (e.g. `CS-25 transport`, `EWIS power distribution`, `normal-category CS-23`, `project-specific`). |
| **Compliance Notes** | Engineering interpretation: what the tool uses from the standard, what it does **not** define, limitations, and whether formal compliance demonstration is out of scope for the calculator. |

### 4.3 Recommended supplementary fields

Align with the PWA reference schema and extend as needed:

- `itemId` — stable unique identifier (e.g. `pwa-trace-vdrop-001`)
- `itemType` — `calculator` | `document` | `equation` | `variable` | `note` | `design-guide`
- `itemLocation` — page path and anchor (e.g. `calculators/aerospace-electrical-design/power-wire-analysis.html#bundle-derating`)
- `functionName` / `toolAction` — human-readable name and behaviour description
- `referenceType` — Standard | Advisory Material | Engineering Model | Project Assumption | Company Standard | Manufacturer Data
- `traceabilityLevel` — A | B | C | D | E
- `evidenceNotes` — supporting rationale
- `userAction` — action required by the engineer or Design Authority
- `documentLibraryId` — manifest `id` when a registered document exists
- `relatedValidationIds` — links to Validation Library case IDs where applicable

### 4.4 Standard family mapping rules

| Family | Index key prefix | Document Library group | Typical reference type |
|--------|------------------|------------------------|------------------------|
| CS-23 | `cs-23` | EASA Certification Specifications | Standard |
| CS-25 | `cs-25` | EASA Certification Specifications | Standard |
| CS-27 | `cs-27` | EASA Certification Specifications | Standard |
| CS-29 | `cs-29` | EASA Certification Specifications | Standard |
| AMC | `amc` | EASA AMC/GM (linked to parent CS) | Advisory Material |
| FAA AC | `faa-ac` | FAA Advisory Circulars | Advisory Material |
| RTCA | `rtca` | RTCA — Certification Standards | Standard |
| SAE | `sae` | SAE — Electrical & Wiring / Systems & Safety | Standard |
| MIL Standards | `mil` | Military Standards (add manifest group if needed) | Standard |
| Company Standards | `company` | Company / Project Standards (add manifest group if needed) | Company Standard |

When a standard is cited but not yet in the Document Library manifest, add a manifest entry or flag the row as `Requires Design Authority confirmation`.

### 4.5 Content-type-specific guidance

| Content type | Traceability expectations |
|--------------|---------------------------|
| **Calculators** | One row per major function, assumption, limit, and output; matrix embedded in calculator page via `<details class="pwa-standards-traceability">`. |
| **Documents** | Each manifest entry includes `standard`, `revision`, and `tags`; traceability row links tools that depend on the document. |
| **Equations** | Each equation in reference pages carries Standard, Clause, and Applicability in metadata or an adjacent traceability panel. |
| **Variables** | Each symbol/parameter definition cites the standard or engineering basis for its meaning, units, and allowed range. |
| **Engineering notes** | Help text and inline notes cite source or declare assumption level (C/D/E). |
| **Design guides** | Workflow steps that imply compliance paths cite applicable CS/AMC/AC/SAE clauses or state project-specific basis. |

---

## 5. Acceptance Criteria

Work is complete when all of the following are true:

1. **Architecture alignment** — Changes follow `PROJECT-STRUCTURE.md` conventions; no duplicate parallel modules.
2. **Universal coverage** — Every in-scope engineering item has a traceability record with Standard, Clause, Revision, Applicability, and Compliance Notes.
3. **Standards Index** — Canonical index exists, covers all cited standard families, and links to Document Library entries where files are registered.
4. **Standards Search** — Free-text and filter search returns correct matches across index and matrix rows.
5. **Traceability Matrix** — Forward matrix renders on calculator pages with summary cards, filters, table, and mobile card layout.
6. **Reverse Traceability** — Selecting a standard or clause lists all dependent engineering items with working links.
7. **Design system compliance** — UI uses `corporate.css` and existing `pwa-trace-*` classes.
8. **Navigation intact** — Global nav, back links, subnav, and Document Library links work.
9. **Calculator integrity** — Calculator mathematics unchanged; traceability is documentation-only.
10. **Data sync** — JSON source files match embedded HTML JSON blocks; generator scripts run without error.
11. **Report integration** — Traceability section exportable where workbook/Word export exists.
12. **Disclaimers present** — Non-compliance and applicability warnings visible.
13. **Responsive** — Verified at mobile (~375px), tablet (~768px), and desktop (~1280px).
14. **Accessible** — Semantic structure, `aria-live` on dynamic search, keyboard navigation, `<noscript>` fallback.
15. **CI-safe** — `node --check` passes for modified JS; no broken relative links in touched HTML.

---

## 6. Deliverables

For each calculator, content area, or traceability expansion task, produce:

### 6.1 Standards Index

- [ ] `assets/js/standards-index.json` (or equivalent canonical index)
- [ ] Standards Index page or hub section with family grouping and Document Library links
- [ ] Manifest updates in `reference/documents/manifest.json` for newly registered standards
- [ ] Regenerated `assets/js/documents-manifest.js` via `python scripts/build-documents-manifest.py`

### 6.2 Traceability data and logic

- [ ] Traceability rows in `assets/js/{tool}-standards-traceability-data.json`
- [ ] Traceability module `assets/js/{tool}-standards-traceability.js` (or shared module extension)
- [ ] Reverse-trace index derived from row data (standard → items, clause → items)
- [ ] Embedded `<script type="application/json" id="{tool}-standards-traceability-data">` synced with JSON source

### 6.3 UI components

- [ ] **Traceability Matrix** `<details>` section on calculator and/or toolkit hub pages
- [ ] **Standards Search** toolbar (family, type, level, free-text filters)
- [ ] **Reverse Traceability** view (standard/clause selector → dependent items table)
- [ ] Summary cards (`pwa-trace-summary-cards`)
- [ ] Mobile card layout (`pwa-trace-cards`)
- [ ] `<noscript>` static table fallback
- [ ] CSS additions in `corporate.css` only if existing classes are insufficient

### 6.4 Content traceability records

For each engineering item, deliver a record containing:

- [ ] Standard
- [ ] Clause
- [ ] Revision
- [ ] Applicability
- [ ] Compliance Notes

### 6.5 Tooling

- [ ] Updated `scripts/gen-traceability-static.js` (or calculator-specific generator)
- [ ] Updated `scripts/patch-traceability-html.js` if HTML insertion is automated
- [ ] Fragment files regenerated (`traceability-tbody.fragment.html`, `traceability-json.fragment.html`)

### 6.6 Cross-references

- [ ] Equations and variables pages updated with traceability metadata where applicable
- [ ] Standards reference pages (e.g. `power-wire-analysis-standards.html`) aligned with matrix rows
- [ ] Validation Library source standards consistent with traceability rows
- [ ] Help pages and design guides cite applicable clauses or declare assumption level

### 6.7 Traceability checklist (per delivery)

#### Repository and conventions

- [ ] Read `PROJECT-STRUCTURE.md` and inspected related existing modules
- [ ] Followed Engineering Knowledge Hub design system
- [ ] Used `site-layout.js` and correct relative asset paths
- [ ] Document Library patterns used for registered standards

#### Coverage

- [ ] All calculator functions mapped
- [ ] All referenced documents indexed
- [ ] Equations and variables traced or scheduled with `TBD` and justification
- [ ] Engineering notes and design guides traced
- [ ] Company Standards clearly labelled and scoped

#### Functional

- [ ] Standards Index complete for cited families
- [ ] Standards Search filters work correctly
- [ ] Forward matrix renders and exports
- [ ] Reverse traceability returns correct dependent items
- [ ] Static HTML regenerates without error

#### Quality and compliance posture

- [ ] No implied certification approval
- [ ] Applicability caveats documented per row
- [ ] Clause `TBD` items flagged for Design Authority resolution
- [ ] Traceability levels A–E assigned with legend visible

---

## Execution instructions for Cursor

When invoked with this prompt:

1. **Inspect first** — Read the files listed in §2 Reference implementation and the target pages before proposing changes.
2. **Index before matrix** — Register standards in the Standards Index and Document Library before adding traceability rows.
3. **Reuse first** — Extend `pwa-standards-traceability` patterns; do not create competing traceability frameworks.
4. **Minimal diff** — Change only files required for the traceability scope.
5. **Bidirectional data** — Ensure forward rows contain enough metadata to power reverse traceability without duplicate manual indexes.
6. **Sync data** — Keep JSON sources, embedded HTML blocks, and generated fragments in sync; run generator scripts after data changes.
7. **Verify** — Walk through §5 Acceptance Criteria and §6.7 Traceability checklist before finishing.
8. **Summarise** — Report items traced, standards added to the index, clause `TBD` items pending Design Authority, and reverse-trace coverage gaps.

---

*Engineering Knowledge Hub — Aerospace Engineering Toolkit — Standards Traceability prompt v1.0*
