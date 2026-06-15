# Aerospace Document Library — Reusable Cursor Prompt

Use this prompt whenever **expanding or maintaining** the **Aerospace Standards and Documents Library** within the Engineering Knowledge Hub repository.

---

## 1. Purpose

Expand and maintain a canonical **Aerospace Standards and Documents Library** that registers, categorises, and cross-links engineering standards, advisories, manufacturer data, and project documents used by the Aerospace Engineering Toolkit.

The library shall serve as the authoritative document registry for:

- Calculator reference panels and wire specification pages
- Standards Traceability Matrix source citations
- Validation Library reference cases
- Engineering notes and design guides
- Design Authority review and audit activities

**Primary goals:**

- Register all aerospace-relevant documents with complete, consistent metadata.
- Support search, filtering, and cross-references between documents, calculators, and engineering notes.
- Maintain sync between `manifest.json`, generated `documents-manifest.js`, and on-disk files.
- Preserve mobile and desktop usability within the Engineering Knowledge Hub design system.

**Guiding principle:** The Document Library supports engineering traceability. Registered documents do not by themselves demonstrate compliance unless accepted under the applicable certification basis and Design Authority process.

---

## 2. Scope

### 2.1 In scope

- Document registration in `reference/documents/manifest.json`
- Physical files in `reference/documents/files/` (PDF, `.docx`, `.xlsx`)
- Generated catalogue: `assets/js/documents-manifest.js`
- Document Library UI: `reference/documents/index.html`, `assets/js/documents-library.js`
- Cross-links to calculators, traceability rows, validation cases, and engineering notes
- Search, filtering, categorisation, and cross-reference display
- Mobile and desktop responsive presentation

### 2.2 Supported document families

The library shall support registration and categorisation of:

| Family | Authority examples | Manifest group guidance |
|--------|-------------------|-------------------------|
| **CS** | EASA CS-23, CS-25, CS-27, CS-29 | `easa-official`, `easa-easy-access` |
| **AMC** | AMC/GM issues linked to CS | `easa-official`, `easa-easy-access` |
| **FAA** | FAA AC, SFAR, regulatory guidance | Add `faa-guidance` group if needed |
| **RTCA** | DO-160, DO-178, DO-254, supplements | `rtca-certification` |
| **SAE** | ARP, AS standards | `sae-electrical`, `sae-systems` |
| **MIL** | MIL-STD, MIL-SPEC | Add `mil-standards` group if needed |
| **Company Standards** | OEM, operator, project-specific docs | Add `company-standards` group; clearly label scope |

### 2.3 Out of scope

- Hosting copyrighted documents without appropriate licence or project approval.
- Automated compliance determination from document presence alone.
- Replacement of formal configuration control or Design Authority document approval.

### 2.4 Reference implementation

Before making changes, review:

| Area | Location |
|------|----------|
| Document Library page | `reference/documents/index.html` |
| Source manifest | `reference/documents/manifest.json` |
| Generated manifest | `assets/js/documents-manifest.js` |
| Build script | `scripts/build-documents-manifest.py` |
| UI module | `assets/js/documents-library.js` |
| Styles | `assets/css/corporate.css` (`documents-*` classes) |
| Calculator document links | `assets/js/calculator-core.js` (`renderReferenceDocumentsBlock`) |
| Wire spec links | `pwa-wire-catalog.js`, `wire-specification.html` |
| Traceability integration | `prompts/standards-traceability.md`, `assets/js/pwa-standards-traceability-data.json` |
| Hub navigation | `index.html`, `calculators/aerospace-electrical-design/index.html` |
| CI validation | `.github/workflows/ci.yml` (manifest drift check) |

---

## 3. Mandatory pre-work

Before adding or modifying documents:

1. **Review existing document structure** — inspect `reference/documents/files/` and current `manifest.json` entries; avoid duplicate registrations.
2. **Review existing manifest system** — understand `groups`, single-file vs `versions` array pattern, and `build-documents-manifest.py` file-existence validation.
3. **Review existing document categorisation** — use established groups; add new groups only when a family lacks representation.
4. **Identify cross-links** — determine which calculators and engineering notes cite each document.
5. **Check traceability and validation** — ensure new documents align with existing traceability rows and validation case source references.

**Do not introduce parallel catalogues.** Extend `manifest.json` and `documents-library.js` only.

---

## 4. Document metadata requirements

### 4.1 Required fields per document

Every registered document (or document family tile with versions) shall include:

| Field | Description | Manifest key |
|-------|-------------|--------------|
| **Title** | Full human-readable title with standard designation | `title` |
| **Revision** | Issue, amendment, edition, or rev letter | `revision` (per version in `versions[]`) |
| **Date** | Publication or issue date (ISO `YYYY-MM` preferred) | `issued` |
| **Authority** | Issuing body: EASA, FAA, RTCA, SAE, MIL, Company | `authority` (extend schema) |
| **Summary** | 1–3 sentence engineering description of scope and use | `summary` |
| **Applicability** | Aircraft category, system, or programme context | `applicability` (extend schema) |
| **Keywords** | Searchable terms for engineering topics | `tags` and/or `keywords` (extend schema) |
| **Linked Calculators** | Calculators that cite this document | `linkedCalculators` (extend schema) |
| **Linked Engineering Notes** | Help pages, standards refs, design guides | `linkedNotes` (extend schema) |

### 4.2 Existing manifest fields (retain)

Continue using established keys:

| Key | Purpose |
|-----|---------|
| `id` | Stable unique identifier (kebab-case, e.g. `sae-arp4404c`) |
| `group` | Category section in library UI |
| `file` | Relative path under `reference/documents/` |
| `type` | `pdf`, `docx`, or `xlsx` |
| `standard` | Standard designation for display and search |
| `sections` | Notable sections/clauses for traceability |
| `versions` | Array of related editions on one tile |
| `pickerLabel` | Custom version picker label (e.g. `amendment`) |

### 4.3 Recommended schema extension

When adding `authority`, `applicability`, `keywords`, `linkedCalculators`, and `linkedNotes`, follow this pattern:

```json
{
  "id": "sae-arp4404c",
  "group": "sae-electrical",
  "title": "SAE ARP4404C — Aircraft Electrical Installations",
  "authority": "SAE",
  "standard": "SAE ARP4404C",
  "revision": "Rev. C",
  "issued": "2013-11",
  "applicability": "Transport aircraft electrical installations; wire sizing and voltage drop",
  "summary": "Aerospace recommended practice for transport aircraft electrical installations…",
  "keywords": ["wire sizing", "voltage drop", "T2", "ampacity"],
  "tags": ["aerospace", "electrical", "standards", "wire sizing"],
  "linkedCalculators": [
    "calculators/aerospace-electrical-design/power-wire-analysis.html"
  ],
  "linkedNotes": [
    "calculators/aerospace-electrical-design/power-wire-analysis-standards.html",
    "calculators/aerospace-electrical-design/power-wire-analysis-help.html"
  ],
  "sections": ["9.3.4.2 Voltage Drop Calculations"],
  "file": "files/sae-arp4404c-aircraft-electrical-installations.pdf",
  "type": "pdf"
}
```

Extend `documents-library.js` to render new fields and include them in `documentSearchText()` when adding schema fields.

### 4.4 Authority normalisation

Use consistent `authority` values:

| Value | Document family |
|-------|-----------------|
| `EASA` | CS, Easy Access Rules |
| `EASA-AMC` | AMC/GM issues |
| `FAA` | Advisory Circulars, SFAR, FAA guidance |
| `RTCA` | DO standards and supplements |
| `SAE` | ARP, AS |
| `MIL` | MIL-STD, MIL-SPEC |
| `Company` | OEM, operator, project-specific (include company name in title) |
| `Manufacturer` | Wire/cable datasheets (existing `wire-cables` group) |

### 4.5 Multi-version documents

Use the `versions` array for related editions (CS amendments, AMC issues, DO revisions):

- One tile per logical standard family.
- Each version entry: `id`, `label`, `revision`, `file`.
- Set `pickerLabel` when appropriate (`amendment`, `issue`, `revision`).
- Sort newest first (existing `versionSortRank` logic in `documents-library.js`).

---

## 5. Functional requirements

### 5.1 Search capability

The library shall provide:

- Free-text search across title, standard, summary, revision, sections, tags, keywords, authority, and applicability.
- Live filter updates with `aria-live` on results (existing `documents-search` input).
- Visible result count (`Showing X of Y documents`).

When extending the schema, update `documentSearchText()` in `documents-library.js` to index new fields.

### 5.2 Filtering

Support filtering by:

| Filter | Implementation |
|--------|----------------|
| Category / group | `documents-group-filter` (existing) |
| Tag / keyword | `documents-tag-filter` (existing; extend tag collection from `keywords`) |
| Authority | Add `documents-authority-filter` when ≥ 2 authorities registered |
| Document type | Add type filter (`pdf` / `docx` / `xlsx`) if mixed catalogue grows |

Filters shall stack (AND logic). Provide **Clear filters** when any filter is active.

### 5.3 Cross references

Implement bidirectional cross-references:

- **Document → Calculators** — render `linkedCalculators` as link list on document card.
- **Document → Engineering notes** — render `linkedNotes` as link list.
- **Calculator → Documents** — reference panel links via `calculator-registry.js` `references` or inline `calc-docs` blocks.
- **Traceability → Documents** — `documentLibraryId` in traceability rows matches manifest `id`.
- **Reverse reference** — from calculator page, list all manifest documents citing that calculator path in `linkedCalculators`.

### 5.4 Mobile compatibility

- Toolbar filters stack vertically on narrow viewports (existing `documents-toolbar` flex layout).
- Document cards use single-column grid on mobile.
- Version picker remains keyboard- and touch-accessible.
- Search input full-width; minimum 44×44px tap targets on controls.

### 5.5 Engineering Knowledge Hub design system

- Use `corporate.css` and existing `documents-*` component classes.
- Include `site-layout.js` on library page; do not duplicate global nav.
- Match card, tag, and filter styling to Hub conventions.
- Add CSS only when no suitable class exists.

### 5.6 File and build workflow

Standard registration workflow:

1. Copy file(s) to `reference/documents/files/` using descriptive kebab-case filenames.
2. Add or update entry in `reference/documents/manifest.json`.
3. Run `python scripts/build-documents-manifest.py` — fails if referenced files are missing.
4. Verify Document Library page loads without error.
5. Update calculator reference panels and traceability `documentLibraryId` links.
6. CI regenerates `documents-manifest.js` and fails on drift.

---

## 6. Required output structure

When executing this prompt, produce the following sections **in order**:

---

### 6.1 Review Findings

Assessment of the current Document Library covering:

| Area | Review questions |
|------|------------------|
| **Document structure** | Are files organised in `files/`? Naming consistent? Duplicates? |
| **Manifest system** | Are all files referenced? Missing `authority`, `applicability`, cross-links? |
| **Categorisation** | Are CS, AMC, FAA, RTCA, SAE, MIL, Company families represented? Group gaps? |
| **Metadata completeness** | Which entries lack Title, Revision, Date, Summary, Keywords, links? |
| **Search & filter** | Do existing search/filter cover new fields? Authority filter needed? |
| **Cross references** | Are calculator ↔ document links bidirectional and accurate? |
| **Traceability alignment** | Do traceability rows cite valid manifest `id` values? |
| **Mobile / desktop** | Layout issues at 375px or 1280px? |
| **Gaps** | Standards cited by calculators but not registered; orphaned files |

Summarise findings by severity: **Critical** (broken files/links), **Major** (missing key standards), **Minor** (incomplete metadata), **Observation** (enhancement opportunity).

---

### 6.2 New Documents

List documents proposed for addition:

| Document | Authority | Family | File to add | Rationale |
|----------|-----------|--------|-------------|-----------|
| | EASA / FAA / SAE / … | CS / AMC / … | `files/…` | Why needed by toolkit |

For each new document specify:

- Title, revision, date, authority, summary, applicability
- Keywords
- Linked calculators and engineering notes
- Target manifest `group`

Do not register documents without confirmed file availability or appropriate usage rights.

---

### 6.3 Manifest Updates

Provide concrete `manifest.json` changes:

- New or updated `groups` entries
- New document entries (full JSON blocks)
- Updated metadata on existing entries
- New `versions` entries for amended standards
- Schema extensions (`authority`, `applicability`, `keywords`, `linkedCalculators`, `linkedNotes`)

Include `documents-library.js` changes required to render and search new fields.

After changes, record:

```
python scripts/build-documents-manifest.py
→ Wrote assets/js/documents-manifest.js (N document(s))
```

---

### 6.4 Validation Checks

Run and report:

| Check | Command / action | Pass criteria |
|-------|------------------|---------------|
| Manifest builds | `python scripts/build-documents-manifest.py` | Exit 0; no missing files |
| Manifest drift | CI-style regen + `git diff assets/js/documents-manifest.js` | No unexpected drift |
| Document count | Compare `documents.length` before/after | Matches expected additions |
| File existence | Every `file` and `versions[].file` path exists on disk | All resolve |
| Link check | `python scripts/check-links.py --scope core` | No broken links to `reference/documents/` |
| Search coverage | Sample queries for new keywords/authorities | New documents appear in results |
| Cross-reference integrity | Each `linkedCalculators` path exists; reverse links consistent | No dangling paths |
| Traceability IDs | Each `documentLibraryId` in traceability data matches manifest `id` | All valid |
| Mobile layout | Review at 375px | Toolbar stacks; cards readable |
| Accessibility | Search has label; results use `aria-live` | No critical a11y gaps |

---

### 6.5 Navigation Updates

List navigation changes required:

| Location | Update |
|----------|--------|
| `index.html` | Hub Reference tile link to Document Library |
| `calculators/aerospace-electrical-design/index.html` | Section link to library |
| Calculator reference panels | Add/update `references` in `calculator-registry.js` or `calc-docs` blocks |
| `power-wire-analysis-standards.html` | Link to registered standard documents |
| `wire-specification.html` | Manufacturer document links via manifest `id` |
| `site-layout.js` | Global nav if library entry needs adding |
| Traceability / validation UI | Document links via manifest `id` |

Verify all updated links resolve via `check-links.py`.

---

## 7. Acceptance criteria

Work is complete when:

1. All requested documents are registered with Title, Revision, Date, Authority, Summary, Applicability, Keywords, Linked Calculators, and Linked Engineering Notes.
2. `python scripts/build-documents-manifest.py` exits 0 with all referenced files present.
3. `assets/js/documents-manifest.js` is regenerated and synced.
4. Document Library search returns new documents by title, standard, keyword, and authority.
5. Filters work correctly (group, tag; authority if implemented).
6. Cross-references render on document cards and calculator reference panels.
7. Traceability `documentLibraryId` values match manifest `id` entries.
8. No broken internal links to document files or library page.
9. Mobile and desktop layouts verified.
10. Navigation updates applied and hub links intact.
11. CI manifest drift check would pass.

---

## 8. Deliverables checklist

### Files
- [ ] `reference/documents/files/` — new document files copied
- [ ] `reference/documents/manifest.json` — entries added/updated
- [ ] `assets/js/documents-manifest.js` — regenerated
- [ ] `assets/js/documents-library.js` — search/filter/render extensions (if needed)
- [ ] `assets/css/corporate.css` — styles only if required

### Cross-links
- [ ] Calculator reference panels updated
- [ ] Engineering notes / standards pages updated
- [ ] Traceability rows cite `documentLibraryId`
- [ ] Validation case source references aligned

### Verification
- [ ] `build-documents-manifest.py` passes
- [ ] `check-links.py --scope core` passes
- [ ] Search and filter manually verified
- [ ] Mobile layout checked

---

## Execution instructions for Cursor

When invoked with this prompt:

1. **Review first** — Read manifest, files folder, and `documents-library.js` before proposing additions.
2. **Produce §6 output** — Review Findings, New Documents, Manifest Updates, Validation Checks, Navigation Updates — before or alongside implementation.
3. **One source of truth** — All metadata lives in `manifest.json`; regenerate `documents-manifest.js`.
4. **Complete metadata** — No new document without all required fields (§4.1).
5. **Bidirectional links** — When adding `linkedCalculators`, update calculator to link back to library.
6. **Extend, don't duplicate** — Add groups and schema fields to existing system.
7. **Validate** — Run build script and link checker before finishing.
8. **Summarise** — Report documents added, manifest count, validation check results, and remaining gaps.

---

*Engineering Knowledge Hub — Aerospace Engineering Toolkit — Document Library prompt v1.0*
