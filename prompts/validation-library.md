# Engineering Validation Library — Reusable Cursor Prompt

Use this prompt whenever building, extending, or auditing the **Engineering Validation Library** for the **Aerospace Engineering Toolkit** within the Engineering Knowledge Hub repository.

---

## 1. Purpose

Build and expand a reusable **Engineering Validation Library** that provides structured, traceable validation evidence for aerospace engineering calculators and tools. The library must support engineering review, audit, and future certification activities without altering calculator mathematics unless explicitly required to fix a validated defect.

The Validation Library compares calculator outputs against approved reference cases — manufacturer datasheets, published standards, laboratory tests, ground/flight tests, project-specific analysis, conservative benchmarks, or controlled user-defined cases — and records the outcome in a consistent, reviewable format.

**Primary goals:**

- Demonstrate that calculator implementations produce results consistent with traceable reference data.
- Provide evidence suitable for engineering confidence assessment and Design Authority review.
- Maintain alignment with existing Hub architecture, design system, and calculator patterns.
- Enable export of validation results into reports, workbooks, and audit trails where supported.

---

## 2. Scope

### In scope

- Validation cases for **existing and new calculators** in the Aerospace Engineering Toolkit.
- Built-in validation templates and user-defined validation cases.
- Static validation data (JSON manifests) and interactive validation UI sections on calculator pages.
- Integration with Standards Traceability, Confidence Rating, Document Library, and report export where applicable.
- Responsive, accessible presentation on mobile and desktop.

### Out of scope

- Declarations of regulatory compliance or certification approval.
- Modification of calculator mathematics solely to pass a validation case without engineering justification.
- Replacement of formal test evidence, configuration control, or Design Authority acceptance processes.

### Reference implementation

Before making changes, review the existing Power Wire Analysis (PWA) validation pattern:

| Area | Location |
|------|----------|
| Validation module | `assets/js/pwa-validation-library.js` |
| Built-in case data | `assets/js/pwa-validation-library-data.json` |
| Static HTML generator | `scripts/gen-validation-static.js` |
| HTML patch utility | `scripts/patch-validation-html.js` |
| Validation section fragment | `scripts/validation-section.fragment.html` |
| Reference calculator page | `calculators/aerospace-electrical-design/power-wire-analysis.html` |
| Standards traceability (related) | `assets/js/pwa-standards-traceability.js` |
| Report / workbook integration | `assets/js/pwa-workbook.js`, `assets/js/pwa-word-report.js` |

---

## 3. Requirements

### 3.1 Repository review (mandatory first step)

Before writing or modifying any file, review the existing repository architecture:

1. Read `PROJECT-STRUCTURE.md` for folder layout, conventions, and build scripts.
2. Inspect `assets/css/corporate.css` for design tokens, component classes, and responsive breakpoints.
3. Inspect `assets/js/site-layout.js` for global navigation, header, footer, and breadcrumb patterns.
4. Inspect calculator architecture:
   - Standard calculators: `assets/js/calculator-core.js`, `assets/js/calculator-registry.js`, shells under `calculators/` with `class="calculator-page"` and `data-calc` on `<body>`.
   - Aerospace toolkit calculators: modular JS under `assets/js/pwa-*.js`, pages under `calculators/aerospace-electrical-design/`.
5. Inspect document library architecture:
   - `reference/documents/index.html`
   - `assets/js/documents-manifest.js`
   - `assets/js/documents-library.js`
   - `scripts/build-documents-manifest.py`
6. Identify whether the target calculator already has validation, traceability, or confidence modules before adding new ones.

**Do not introduce parallel patterns** when an established module, data file, generator script, or CSS namespace already exists.

### 3.2 Engineering Knowledge Hub design system

Follow the existing Engineering Knowledge Hub design system:

- Load shared styles from `assets/css/corporate.css`.
- Use existing CSS variables (`--corp-navy`, `--corp-border`, `--corp-radius-lg`, `--corp-text-muted`, etc.).
- Reuse established component patterns: `page-hero`, `page-container`, `card`, `card-grid`, `details`/`summary` collapsible sections, `pwa-*` namespaces for aerospace tools.
- Match typography, spacing, border radius, and colour usage to neighbouring calculator sections.
- Add new styles only to `corporate.css` when no suitable class exists; prefer extending existing `pwa-validation-library` and `pwa-trace-badge` patterns.

### 3.3 Navigation and styling conventions

- Include `site-layout.js` on all pages; do not duplicate global nav markup.
- Use relative paths to `assets/` appropriate to page depth.
- Provide contextual back links (e.g. `back-link` to section index).
- Use `pwa-subnav` for multi-page aerospace calculator sections where applicable.
- Preserve breadcrumb and hub links to **Engineering Knowledge Hub** (`index.html`).
- Ensure collapsible validation sections use semantic `<details>`/`<summary>` with visible titles and subtitles.
- Apply consistent badge styling for evidence quality and validation status.

### 3.4 Calculator architecture

- **Do not alter calculator mathematics** when adding validation; validation compares outputs against reference data.
- Expose a snapshot or getter API from the calculator module so validation can read current inputs and computed results (follow `PwaGridCalculator.getConfidenceSnapshot()` pattern).
- Store built-in validation cases in JSON data files under `assets/js/`; embed synced JSON in HTML via `<script type="application/json" id="…-validation-library-data">`.
- Provide a Node generator script under `scripts/` to regenerate static HTML fragments from JSON where the PWA pattern applies.
- Register standard calculators in `calculator-registry.js`; do not bypass `calculator-core.js` conventions.
- Link to relevant standards and documents via the Document Library where source standards are cited.

### 3.5 Document library architecture

- Cite source standards using document IDs from `documents-manifest.js` where available.
- Prefer registered documents in `reference/documents/files/` over external-only references.
- When a standard is not yet in the manifest, note it as requiring Design Authority confirmation and add a manifest entry if appropriate.
- Follow document library grouping, tagging, and version-sort conventions when adding new references.

### 3.6 Validation Library functional requirements

The Validation Library shall:

- Be suitable for **aerospace engineering tools** (electrical, thermal, installation, compliance-support calculators).
- Support **engineering traceability** — link each case to source standard, clause, evidence type, and Design Authority status.
- Support **validation evidence** — evidence quality levels (A–E), case type, source reference, limitations, and notes.
- Support **future certification activities** — structured records exportable to Word/Excel/workbook where integrated; clear disclaimers that validation ≠ certification approval.
- Support **engineering review and audit** — filterable tables, static fallbacks for no-JS, persistent user cases via `localStorage` where appropriate.

### 3.7 Validation case schema (required fields)

For **every calculator**, define one or more validation cases containing at minimum:

| Field | Description |
|-------|-------------|
| **Validation ID** | Unique, stable identifier (e.g. `pwa-val-001`, `tru-val-benchmark-01`). Never reuse IDs across calculators. |
| **Calculator Name** | Human-readable calculator title as shown on the page. |
| **Validation Description** | What is being validated, which outputs are compared, and under what conditions. |
| **Source Standard** | Applicable standard, advisory document, or approved data source (e.g. SAE ARP4404, EASA CS-25, manufacturer datasheet). |
| **Source Clause** | Specific clause, table, paragraph, or test section supporting the expected result. |
| **Input Values** | Complete set of calculator inputs for the case (all parameters required to reproduce the run). |
| **Expected Result** | Reference value from the source (with units). |
| **Calculated Result** | Value produced by the calculator for the same inputs (populated at run/compare time). |
| **Error Percentage** | `((Calculated − Expected) / Expected) × 100` when Expected ≠ 0; otherwise document absolute delta and comparison method. |
| **Validation Status** | One of: **Pass**, **Pass with Limitations**, **Review Required**, **Fail**. |

#### Validation Status definitions

| Status | Criteria |
|--------|----------|
| **Pass** | Calculated result within agreed tolerance of expected result; evidence quality and source are acceptable for the stated use. |
| **Pass with Limitations** | Result within tolerance but constrained by assumptions, incomplete source data, interpolated clauses, or evidence quality below ideal. |
| **Review Required** | Comparison incomplete, tolerance exceeded but potentially explainable, source clause applicability uncertain, or evidence pending Design Authority acceptance. |
| **Fail** | Calculated result outside tolerance, inputs cannot be applied, reference data invalid, or comparison methodology is unsound. |

Document tolerance thresholds per output type in the validation description or calculator-specific validation README notes.

### 3.8 Evidence and traceability metadata (recommended per case)

Extend cases with fields aligned to the PWA reference implementation:

- Case type (Manufacturer Datasheet, Published Reference, Laboratory Test, Aircraft Ground Test, Flight Test, Project-Specific Analysis, Conservative Benchmark, User-Defined Case)
- Evidence quality (A–E)
- Source reference (free text with document library link where possible)
- Limitations
- Design Authority status
- Created by / date added
- Notes

### 3.9 Responsive design and accessibility

All validation UI must meet:

- **Mobile compatibility** — usable on viewports ≥ 320px; no horizontal overflow of critical content; touch-friendly controls (min 44×44px tap targets).
- **Desktop compatibility** — readable layout at wide breakpoints; tables scroll horizontally inside containers when needed.
- **Responsive design** — use existing `corporate.css` breakpoints; stack filters and forms on narrow screens; preserve readability of comparison tables.
- **Accessibility compliance** — WCAG 2.1 Level AA intent:
  - Semantic HTML (`<table>`, `<th scope>`, `<label>`, `<fieldset>`, `<details>`)
  - `aria-label` / `aria-live` for dynamic comparison results
  - `role="note"` for disclaimers and confidence notes
  - Sufficient colour contrast using existing Hub palette
  - Keyboard-operable controls; visible focus states
  - Static HTML fallback content inside `<noscript>` for critical validation summaries

### 3.10 Disclaimers (required)

Include visible disclaimer text stating that:

- Validation Library results support model confidence and engineering review.
- Validation does **not** by itself constitute certification approval.
- Formal use requires approved data, controlled test evidence, configuration control, and Design Authority acceptance.

---

## 4. Acceptance Criteria

Work is complete when all of the following are true:

1. **Architecture alignment** — Changes follow existing folder layout, naming, and module patterns documented in `PROJECT-STRUCTURE.md`.
2. **Design system compliance** — Validation UI uses `corporate.css` classes and matches adjacent calculator sections visually.
3. **Navigation intact** — Global nav, back links, and section subnav work from the modified pages.
4. **Calculator integrity** — Calculator mathematics are unchanged unless a separate, justified defect fix is in scope.
5. **Complete case coverage** — Every targeted calculator has at least one built-in validation case with all required schema fields defined.
6. **Comparison works** — Selecting a case and running comparison populates Calculated Result, Error Percentage, and Validation Status correctly.
7. **Traceability** — Source Standard and Source Clause are populated and, where possible, linked to Document Library entries.
8. **Status logic** — Validation Status correctly reflects tolerance rules and evidence limitations.
9. **Static fallback** — Built-in cases are visible in static HTML and JSON; `node scripts/gen-validation-static.js` (or equivalent) regenerates fragments without error.
10. **Persistence** — User-defined cases persist across sessions when localStorage is enabled (where the calculator supports user cases).
11. **Report integration** — Where workbook/Word export exists, validation results can be included in exports.
12. **Responsive** — Layout verified at mobile (~375px), tablet (~768px), and desktop (~1280px) widths.
13. **Accessible** — No critical accessibility regressions; dynamic updates announced via `aria-live`.
14. **CI-safe** — `node --check` passes for modified JS; no broken relative links in touched HTML.

---

## 5. Deliverables

For each calculator or validation expansion task, produce:

### 5.1 Data and logic

- [ ] Validation case entries in `assets/js/{calculator}-validation-library-data.json` (or extension of existing JSON).
- [ ] Validation module `assets/js/{calculator}-validation-library.js` (or extension of shared module) implementing compare logic, status determination, and UI rendering.
- [ ] Calculator snapshot/getter integration so validation reads live inputs and results.

### 5.2 UI and assets

- [ ] Validation Library `<details>` section embedded in the calculator HTML page.
- [ ] Embedded `<script type="application/json" id="{calculator}-validation-library-data">` block synced with JSON source.
- [ ] CSS additions in `assets/css/corporate.css` only if existing classes are insufficient.
- [ ] `<noscript>` static summary table of built-in cases.

### 5.3 Tooling

- [ ] Generator script `scripts/gen-validation-static.js` updated or calculator-specific equivalent.
- [ ] Patch script updated if HTML insertion is automated via `scripts/patch-validation-html.js` pattern.

### 5.4 Documentation

- [ ] Validation cases documented with Validation ID, tolerance rules, and known limitations.
- [ ] Source standards mapped to Document Library manifest entries where applicable.

### 5.5 Validation records (per case)

- [ ] Validation ID
- [ ] Calculator Name
- [ ] Validation Description
- [ ] Source Standard
- [ ] Source Clause
- [ ] Input Values
- [ ] Expected Result
- [ ] Calculated Result (verified at runtime)
- [ ] Error Percentage (computed)
- [ ] Validation Status (assigned per rules)

---

## 6. Validation Checklist

Use this checklist before marking the task complete.

### Repository and conventions

- [ ] Read `PROJECT-STRUCTURE.md` and inspected related existing modules.
- [ ] Followed Engineering Knowledge Hub design system (`corporate.css`, existing `pwa-*` / `calc-*` classes).
- [ ] Used `site-layout.js`; no duplicated global navigation.
- [ ] Relative asset paths are correct for page depth.
- [ ] Followed standard or PWA calculator architecture as appropriate.
- [ ] Document Library patterns used for standard citations.

### Validation content

- [ ] At least one validation case per calculator output type under test.
- [ ] Every case has a unique Validation ID.
- [ ] Source Standard and Source Clause recorded for each case.
- [ ] Input Values are complete and reproducible.
- [ ] Expected Results cite traceable reference data.
- [ ] Tolerance thresholds documented.
- [ ] Validation Status values use only: Pass, Pass with Limitations, Review Required, Fail.
- [ ] Evidence quality and case type assigned.
- [ ] Limitations and Design Authority status stated where applicable.
- [ ] Required disclaimers present.

### Functional verification

- [ ] Built-in cases load from JSON embedded in HTML.
- [ ] Compare action produces Calculated Result and Error Percentage.
- [ ] Validation Status updates correctly for pass and fail scenarios.
- [ ] User-defined case create/edit/delete works (if supported).
- [ ] localStorage persistence works across page reload.
- [ ] Static HTML regenerates via generator script without error.
- [ ] Report/workbook export includes validation section (if applicable).

### Responsive and accessibility

- [ ] Usable on mobile (320–480px).
- [ ] Usable on desktop (≥1024px).
- [ ] Tables scroll within containers; no layout breakage.
- [ ] Touch targets adequate on interactive controls.
- [ ] Semantic structure and table headers correct.
- [ ] Dynamic results use `aria-live` where updated without full page reload.
- [ ] Disclaimers use `role="note"`.
- [ ] Keyboard navigation and focus order are logical.
- [ ] `<noscript>` fallback renders built-in case index.

### Engineering and audit readiness

- [ ] Validation does not claim certification approval.
- [ ] Traceability links to standards matrix where both exist on the same calculator.
- [ ] Confidence rating integration noted where applicable.
- [ ] Configuration/version identifiers recorded for reproducibility (calculator JS version query strings, data file dates).

---

## Execution instructions for Cursor

When invoked with this prompt:

1. **Inspect first** — Read the files listed in §3.1 and the target calculator page before proposing changes.
2. **Reuse first** — Extend `pwa-validation-library` patterns for aerospace tools; extend `calculator-core` patterns for standard calculators.
3. **Minimal diff** — Change only files required for the validation scope; do not refactor unrelated calculators.
4. **Sync data** — Keep JSON source files and embedded HTML JSON blocks in sync; run generator scripts after data changes.
5. **Verify** — Walk through §6 Validation Checklist and fix gaps before finishing.
6. **Summarise** — Report which calculators were updated, how many validation cases were added, and any items marked Review Required or Pass with Limitations pending Design Authority data.

---

*Engineering Knowledge Hub — Aerospace Engineering Toolkit — Validation Library prompt v1.0*
