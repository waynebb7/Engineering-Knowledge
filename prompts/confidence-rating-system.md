# Engineering Confidence Rating System — Reusable Cursor Prompt

Use this prompt whenever building, extending, or auditing the **Engineering Confidence Rating System** for the **Aerospace Engineering Toolkit** within the Engineering Knowledge Hub repository.

---

## 1. Purpose

Build and maintain an **Engineering Confidence Rating System** that communicates the evidence strength, source quality, and engineering assurance level of every page, calculator function, input, assumption, and output in the Aerospace Engineering Toolkit.

The confidence system is an engineering assurance layer. It helps engineers and reviewers identify which results are directly supported by regulatory sources, which rely on industry standards or textbooks, and which depend on estimates or informational guidance requiring further validation or Design Authority acceptance.

**Primary goals:**

- Assign a consistent **Confidence Rating** (A–E) to every engineering item and page.
- Display **Source Type**, **Validation Status**, and **Traceability Status** alongside each rating.
- Provide clear **visual indicators** using the established Hub badge and summary-card patterns.
- Integrate with the Standards Traceability Matrix and Validation Library without altering calculator mathematics.
- Support engineering review, audit, and future certification activities through exportable confidence summaries.

**Guiding principle:** Confidence ratings are an engineering aid. They do not constitute certification approval, compliance finding, or Design Authority acceptance.

---

## 2. Scope

### In scope

- Confidence ratings for **all Aerospace Engineering Toolkit** pages and engineering items:
  - Calculator pages (inputs, assumptions, outputs, limits)
  - Standards reference pages and help pages
  - Design guides and engineering notes
  - Equations and variables in reference pages
  - Document Library entries cited by calculators
- Page-level confidence summary banner or panel on every in-scope page.
- Item-level confidence rows within calculator confidence sections.
- Visual indicators (badges, summary cards, warning callouts, overall classification).
- Integration with Standards Traceability Matrix and Validation Library.
- Report and workbook export of confidence data where supported.
- Responsive, accessible presentation on mobile and desktop.

### Out of scope

- Modification of calculator mathematics when adding confidence metadata.
- Automated compliance determination or certification approval.
- Replacement of formal test evidence, traceability records, or Design Authority acceptance.

### Reference implementation

Before making changes, review the existing Power Wire Analysis (PWA) confidence pattern:

| Area | Location |
|------|----------|
| Confidence module | `assets/js/pwa-confidence-rating.js` |
| Row definitions | `assets/js/pwa-confidence-rating-data.json` |
| Static HTML generator | `scripts/gen-confidence-static.js` |
| HTML patch utility | `scripts/patch-confidence-html.js` |
| Reference calculator page | `calculators/aerospace-electrical-design/power-wire-analysis.html` |
| Related modules | `assets/js/pwa-standards-traceability.js`, `assets/js/pwa-validation-library.js` |
| Shared badge styles | `assets/css/corporate.css` (`pwa-trace-badge`, `pwa-conf-*`) |
| Report integration | `assets/js/pwa-workbook.js`, `assets/js/pwa-word-report.js` |

---

## 3. Rating Definitions

### 3.1 Confidence Rating scale (A–E)

Every engineering item and page shall be assigned exactly one confidence rating:

| Rating | Label | Definition | Typical source examples |
|--------|-------|------------|-------------------------|
| **A** | Direct Regulatory Source | Directly traceable to a regulatory certification specification, binding rule, or approved regulatory interpretation accepted under the certification basis. | EASA CS-23/25/27/29, AMC/GM, FAA regulations, Design Authority–accepted regulatory data |
| **B** | Industry Standard | Derived from a recognised aerospace industry standard, advisory circular, or RTCA/SAE document widely used in civil aircraft engineering. | SAE ARP/AS standards, RTCA DO-160, FAA AC, MIL-STD (where applicable) |
| **C** | Engineering Textbook | Based on established engineering theory, published textbook formulae, or recognised physics/mathematics principles without direct regulatory citation. | Engineering textbooks, peer-reviewed references, fundamental physics/electrical theory |
| **D** | Engineering Estimate | Physics-based model, calculated estimate, conservative default, or user-entered value not yet confirmed against approved project data. | Engineering calculations, conservative assumptions, user estimates, interpolated values |
| **E** | Informational Guidance | Provided for orientation, education, or preliminary assessment only; requires test, inspection, validation, or project-specific evidence before formal engineering use. | Informational notes, unvalidated templates, guidance pending Design Authority acceptance |

### 3.2 Visual indicator mapping

Reuse the established `pwa-trace-badge` colour scheme for consistent styling across traceability, validation, and confidence systems:

| Rating | Badge class | Colour intent |
|--------|-------------|---------------|
| A | `pwa-trace-badge--level-a` | Strong / regulatory |
| B | `pwa-trace-badge--level-b` | Industry standard |
| C | `pwa-trace-badge--level-c` | Textbook / model |
| D | `pwa-trace-badge--level-d` | Estimate / assumption |
| E | `pwa-trace-badge--level-e` | Guidance / validation required |

Display ratings as:

- Letter badge (e.g. `A`) with full label in `title` attribute and adjacent text where space permits.
- Summary cards showing count per rating level.
- Overall page classification derived from the lowest (weakest) rating present.
- Warning callouts when D- or E-rated safety-critical items are present.

### 3.3 Source Type

Every page and item shall declare a **Source Type** identifying the origin of the engineering basis:

| Source Type | Typical confidence rating |
|-------------|---------------------------|
| Regulatory Specification | A |
| Acceptable Means of Compliance (AMC/GM) | A or B |
| Industry Standard (SAE, RTCA) | B |
| FAA Advisory Circular | B |
| Engineering Textbook / Published Reference | C |
| Engineering Calculation / Physics Model | C or D |
| Manufacturer Datasheet | A or B |
| Approved Load Analysis / Project Data | A or B |
| Test / Measured Data | A |
| User Estimate / Conservative Default | D |
| Informational Guidance / Template | E |
| Design Authority Approved | A |

Source Type shall be displayed as text and/or a typed badge alongside the confidence rating badge.

### 3.4 Validation Status

Every page and item shall display **Validation Status** reflecting its state in the Validation Library (see `prompts/validation-library.md`):

| Status | Meaning |
|--------|----------|
| **Pass** | Validated against reference data within tolerance |
| **Pass with Limitations** | Validated with documented constraints |
| **Review Required** | Validation incomplete or pending Design Authority |
| **Fail** | Outside tolerance or comparison unsound |
| **Not Validated** | No validation case exists or comparison not yet run |

Validation Status may improve confidence ratings where measured or approved reference data is available (e.g. promote D → B or E → A when validation passes with strong evidence).

### 3.5 Traceability Status

Every page and item shall display **Traceability Status** reflecting its state in the Standards Traceability Matrix (see `prompts/standards-traceability.md`):

| Status | Meaning |
|--------|----------|
| **Traced** | Standard, clause, revision, and applicability documented |
| **Partially Traced** | Standard identified; clause or revision TBD |
| **Review Required** | Traceability row exists but requires Design Authority confirmation |
| **Not Traced** | No traceability record yet (flag for completion) |
| **Not Applicable** | Item is purely informational with no standards basis |

### 3.6 Overall page classification

Derive an overall page-level confidence classification from item ratings:

| Classification | Condition |
|----------------|-----------|
| **High Confidence** | No D- or E-rated items; all safety-critical items rated A or B |
| **Moderate Confidence** | Contains D-rated items but no E-rated safety-critical items |
| **Low Confidence** | Contains E-rated items |
| **Review Required** | Any safety-critical item rated D or E |

Display the overall classification prominently in the page-level confidence panel.

---

## 4. Functional Requirements

### 4.1 Repository review (mandatory first step)

Before writing or modifying any file:

1. Read `PROJECT-STRUCTURE.md` for folder layout and conventions.
2. Inspect `assets/css/corporate.css` for `pwa-confidence-rating`, `pwa-conf-*`, and `pwa-trace-badge` classes.
3. Inspect `assets/js/site-layout.js` for navigation patterns.
4. Inspect calculator architecture (`calculator-core.js`, `calculator-registry.js`, `pwa-*.js` modules).
5. Inspect related assurance modules: `pwa-standards-traceability.js`, `pwa-validation-library.js`.
6. Identify existing confidence, traceability, and validation coverage on the target page.

**Do not introduce parallel patterns** when an established module, data file, generator script, or CSS namespace already exists.

### 4.2 Page-level display (required on every in-scope page)

Every Aerospace Engineering Toolkit page shall display a **page confidence panel** containing at minimum:

| Field | Description |
|-------|-------------|
| **Confidence Rating** | Overall page rating (lowest/weakest item rating or declared page default) |
| **Source Type** | Dominant source type for the page content |
| **Validation Status** | Aggregate validation state (worst case among linked validation cases) |
| **Traceability Status** | Aggregate traceability state (worst case among linked traceability rows) |

Implementation options (choose the pattern that fits the page type):

- Compact **confidence banner** below the page title or subnav.
- Collapsible `<details class="pwa-confidence-rating">` section for full item-level detail.
- Inline badge group in the page hero for lightweight pages (help, standards reference).

All four fields must be visible without requiring the user to expand collapsed sections on initial page load (summary values in banner; detail in expandable section).

### 4.3 Item-level display (required per engineering item)

Within calculator confidence sections, each rated item shall display:

| Field | Description |
|-------|-------------|
| **Confidence Rating** | A–E badge with label |
| **Source Type** | Evidence source selector or declared source |
| **Validation Status** | Linked validation case status or `Not Validated` |
| **Traceability Status** | Linked traceability row status or `Not Traced` |

Additional recommended fields (per PWA reference schema):

- Item name and category (Input / Assumption / Output / Reference)
- Current value (live from calculator snapshot)
- Basis, risk if incorrect, recommended action
- Safety-critical flag

### 4.4 Engineering Knowledge Hub design system

- Load shared styles from `assets/css/corporate.css`.
- Reuse `pwa-confidence-rating`, `pwa-conf-summary`, `pwa-conf-card`, `pwa-conf-table`, and `pwa-trace-badge` patterns.
- Match typography, spacing, and collapsible `<details>`/`<summary>` conventions to adjacent sections.
- Add new CSS only when no suitable class exists; extend existing namespaces.

### 4.5 Visual indicators (required)

Provide consistent visual indicators across all pages:

- **Rating badges** — coloured A–E letter badges using `pwa-trace-badge--level-*`.
- **Summary cards** — count of items per rating level and lowest rating.
- **Overall classification** — High / Moderate / Low / Review Required with explanatory text.
- **Warning callouts** — visible when D- or E-rated items exist; elevated warning for safety-critical D/E items.
- **Manual override marker** — asterisk or icon when user overrides default rating.
- **Source type labels** — text or typed badge adjacent to rating.
- **Status chips** — Validation Status and Traceability Status as compact, readable labels.

All indicators must remain legible and distinguishable without relying on colour alone (include letter, text label, or icon).

### 4.6 Consistent styling (required)

- Use the same badge colours and level semantics across confidence, traceability, and validation modules.
- Apply consistent filter toolbar layout (`pwa-conf-filters` pattern).
- Table layout on desktop; card layout on mobile (`pwa-conf-cards`).
- Align disclaimer, cross-reference, and legend blocks with traceability and validation section styling.

### 4.7 Data architecture

- Store row definitions in `assets/js/{tool}-confidence-rating-data.json`.
- Embed synced JSON in HTML via `<script type="application/json" id="{tool}-confidence-rating-data">`.
- Regenerate static HTML fragments with `node scripts/gen-confidence-static.js` (or equivalent).
- Persist user evidence-source and rating overrides in `localStorage` where interactive selectors are supported.
- Expose calculator snapshot API (follow `PwaGridCalculator.getConfidenceSnapshot()` pattern) for live current values.

### 4.8 Cross-module integration

- **Standards Traceability:** Confidence ratings complement traceability; traceability identifies the reference basis, confidence identifies evidence strength. Cross-reference via `CROSS_REF_TEXT` pattern. Sync traceability level (A–E) with confidence rating where appropriate.
- **Validation Library:** Validation results may upgrade confidence ratings when reference data is available. Display linked validation case ID and status per item.
- **Report export:** Expose `buildConfidenceReportSection()` / `getExportData()` for Word and workbook export.
- **Document Library:** Source Type may link to manifest document IDs for standards-based items.

### 4.9 Interactive behaviour

Where JavaScript is available:

- Evidence source selector auto-maps to suggested confidence rating (user may override).
- Live refresh of current values when calculator inputs change.
- Filter by category, rating, evidence source, and free-text search.
- Reset to defaults control.
- Include-in-report checkbox for export.

Where JavaScript is unavailable:

- `<noscript>` static table with default ratings and declared Source Type, Validation Status, Traceability Status.

### 4.10 Mobile and desktop compatibility (required)

- **Mobile (≥ 320px):** Stacked summary cards; card layout for item rows; touch-friendly selects (min 44×44px); no horizontal overflow of critical content.
- **Desktop (≥ 1024px):** Full table with filters; summary cards in grid; page banner with four required fields visible.
- **Responsive:** Table scrolls within container on narrow viewports; filters stack vertically on mobile.
- **Accessibility:** Semantic tables with `<th scope>`; `aria-label` on selects; `aria-live` on summary updates; `role="note"` on disclaimers; keyboard-operable controls; sufficient contrast.

### 4.11 Disclaimers (required)

Display visible disclaimer text stating:

- Confidence ratings are an engineering aid, not certification approval.
- Formal use requires confirmation against the applicable aircraft certification basis, approved data, and project procedures.
- Low-confidence items may be suitable for preliminary assessment only.

---

## 5. Acceptance Criteria

Work is complete when all of the following are true:

1. **Architecture alignment** — Changes follow `PROJECT-STRUCTURE.md` and extend existing `pwa-confidence-rating` patterns.
2. **Page coverage** — Every in-scope page displays Confidence Rating, Source Type, Validation Status, and Traceability Status at page level.
3. **Item coverage** — Every calculator input, assumption, output, and reference item has an item-level confidence record with all four fields.
4. **Rating correctness** — A–E ratings follow §3.1 definitions; no item left unrated.
5. **Visual indicators** — Badges, summary cards, warnings, and status chips render correctly.
6. **Consistent styling** — UI matches Hub design system and aligns with traceability/validation sections.
7. **Calculator integrity** — Calculator mathematics unchanged; confidence is assurance metadata only.
8. **Cross-module links** — Traceability and validation statuses reflect actual linked records.
9. **Data sync** — JSON source files match embedded HTML JSON; generator scripts run without error.
10. **Report integration** — Confidence section exportable where workbook/Word export exists.
11. **Mobile compatible** — Layout verified at ~375px; cards and banner readable.
12. **Desktop compatible** — Table, filters, and summary verified at ~1280px.
13. **Accessible** — Semantic structure, `aria-live`, keyboard navigation, `<noscript>` fallback.
14. **CI-safe** — `node --check` passes for modified JS; no broken relative links.

---

## 6. Deliverables

For each calculator, page, or confidence expansion task, produce:

### 6.1 Data and logic

- [ ] Row definitions in `assets/js/{tool}-confidence-rating-data.json`
- [ ] Confidence module `assets/js/{tool}-confidence-rating.js` (or extension of shared module)
- [ ] Page-level confidence metadata (overall rating, source type, validation status, traceability status)
- [ ] Calculator snapshot integration for live current values
- [ ] Embedded `<script type="application/json" id="{tool}-confidence-rating-data">` synced with JSON source

### 6.2 UI components

- [ ] **Page confidence panel** — banner or hero badges showing all four required fields
- [ ] **Confidence Rating section** — `<details class="pwa-confidence-rating">` with item-level table/cards
- [ ] **Visual indicators** — rating badges, summary cards, overall classification, warning callouts
- [ ] **Filter toolbar** — category, rating, evidence source, search
- [ ] **Legend** — A–E definitions visible within the section
- [ ] **Cross-reference note** — link to Standards Traceability and Validation Library
- [ ] **Disclaimer** — non-approval engineering aid statement
- [ ] `<noscript>` static fallback table
- [ ] CSS additions in `corporate.css` only if existing classes are insufficient

### 6.3 Per-page display record

For every page, deliver visible display of:

- [ ] Confidence Rating
- [ ] Source Type
- [ ] Validation Status
- [ ] Traceability Status

### 6.4 Per-item display record

For every engineering item, deliver:

- [ ] Confidence Rating (A–E)
- [ ] Source Type
- [ ] Validation Status
- [ ] Traceability Status
- [ ] Basis, risk, and recommended action (where applicable)

### 6.5 Tooling

- [ ] Updated `scripts/gen-confidence-static.js` (or calculator-specific generator)
- [ ] Updated `scripts/patch-confidence-html.js` if HTML insertion is automated

### 6.6 Integration

- [ ] Traceability rows cross-referenced; Traceability Status populated
- [ ] Validation cases cross-referenced; Validation Status populated
- [ ] Report/workbook export includes confidence section
- [ ] Validation Library integration note where ratings can be upgraded by evidence

### 6.7 Confidence checklist (per delivery)

#### Repository and conventions

- [ ] Read `PROJECT-STRUCTURE.md` and inspected related modules
- [ ] Followed Engineering Knowledge Hub design system
- [ ] Reused `pwa-trace-badge` and `pwa-conf-*` classes
- [ ] Used `site-layout.js` and correct relative asset paths

#### Page display

- [ ] Page-level Confidence Rating visible on load
- [ ] Page-level Source Type visible on load
- [ ] Page-level Validation Status visible on load
- [ ] Page-level Traceability Status visible on load

#### Item coverage

- [ ] All inputs rated
- [ ] All assumptions rated
- [ ] All outputs rated
- [ ] All four fields present per item

#### Visual and responsive

- [ ] Badges render with correct A–E colours
- [ ] Summary cards show rating counts
- [ ] Warnings appear for D/E and safety-critical items
- [ ] Mobile card layout works at 375px
- [ ] Desktop table layout works at 1280px
- [ ] Styling consistent with traceability and validation sections

#### Quality

- [ ] No implied certification approval
- [ ] Disclaimers present
- [ ] Static HTML regenerates without error
- [ ] `node --check` passes

---

## Execution instructions for Cursor

When invoked with this prompt:

1. **Inspect first** — Read the files listed in §2 Reference implementation and the target page before proposing changes.
2. **Rate every page** — Add page-level confidence panel with all four required fields before item-level detail.
3. **Reuse first** — Extend `pwa-confidence-rating` patterns; share badge classes with traceability and validation.
4. **Link modules** — Populate Validation Status and Traceability Status from actual linked records, not placeholders.
5. **Minimal diff** — Change only files required for the confidence scope.
6. **Sync data** — Keep JSON sources, embedded HTML blocks, and generated fragments in sync.
7. **Verify** — Walk through §5 Acceptance Criteria and §6.7 Confidence checklist before finishing.
8. **Summarise** — Report pages updated, item count per rating, items at D/E, and any Validation or Traceability gaps.

---

*Engineering Knowledge Hub — Aerospace Engineering Toolkit — Confidence Rating System prompt v1.0*
