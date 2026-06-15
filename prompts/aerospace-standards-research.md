# Aerospace Standards Research — Reusable Cursor Prompt

Use this prompt whenever **researching aerospace engineering standards** and **integrating findings** into the **Aerospace Engineering Toolkit** within the Engineering Knowledge Hub repository.

---

## Role

Act simultaneously as:

| Role | Responsibility |
|------|----------------|
| **Certification Engineer** | Certification basis, CS/AMC applicability, means of compliance, verification and substantiation |
| **Design Engineer** | Design implications, margins, installation constraints, calculator-relevant parameters |
| **Technical Author** | Clear engineering notes, clause summaries, user guidance, traceable documentation |

All research outputs must be accurate, appropriately scoped, and clearly distinguished from Design Authority interpretation. Do not present research summaries as compliance determinations.

---

## 1. Purpose

Research one or more aerospace engineering standards and translate findings into actionable toolkit integration — document registration, traceability rows, validation cases, engineering notes, and calculator enhancements.

**Primary goals:**

- Produce structured standard intelligence suitable for engineering review and toolkit development.
- Identify calculator, validation, and traceability integration opportunities.
- Link every finding to concrete toolkit artefacts (calculators, validation library, standards matrix, engineering notes).
- Maintain alignment with existing Hub architecture, Document Library, and assurance modules.

**Guiding principle:** Standards research supports engineering understanding and traceability. It does not constitute certification approval, compliance finding, or Design Authority acceptance.

---

## 2. Scope

### 2.1 In scope

- Research of aerospace standards cited or required by the toolkit:
  - **EASA CS** — CS-23, CS-25, CS-27, CS-29
  - **AMC / GM** — Acceptable Means of Compliance
  - **FAA** — Advisory Circulars, SFAR, regulatory guidance
  - **RTCA** — DO-160, DO-178, DO-254, supplements
  - **SAE** — ARP, AS standards (e.g. ARP4404, AS50881)
  - **MIL** — MIL-STD / MIL-SPEC where applicable
  - **Company Standards** — project-specific documents (clearly labelled)
- Translation of research into toolkit updates per related prompts.
- Cross-linking to Document Library registered documents where files exist.

### 2.2 Out of scope

- Declarations of regulatory compliance for a specific aircraft or modification.
- Replacement of formal certification planning, test programmes, or Design Authority sign-off.
- Copying copyrighted standard text verbatim beyond short fair-use quotations; summarise and cite clause references instead.

### 2.3 Integration targets

Link all findings to applicable toolkit artefacts:

| Target | Location / prompt |
|--------|-------------------|
| **Calculators** | `calculators/aerospace-electrical-design/`, `assets/js/pwa-*.js`, `prompts/power-wire-analysis.md` |
| **Validation Library** | `pwa-validation-library-data.json`, `prompts/validation-library.md` |
| **Standards Matrix** | `pwa-standards-traceability-data.json`, `prompts/standards-traceability.md` |
| **Engineering Notes** | `power-wire-analysis-help.html`, `power-wire-analysis-standards.html`, inline guidance |
| **Document Library** | `reference/documents/manifest.json`, `prompts/aerospace-document-library.md` |
| **Confidence Rating** | `pwa-confidence-rating-data.json`, `prompts/confidence-rating-system.md` |

### 2.4 Reference implementation

Before researching or integrating, review:

| Area | Location |
|------|----------|
| Document Library | `reference/documents/index.html`, `reference/documents/manifest.json` |
| Standards reference page | `calculators/aerospace-electrical-design/power-wire-analysis-standards.html` |
| Traceability data | `assets/js/pwa-standards-traceability-data.json` |
| Validation data | `assets/js/pwa-validation-library-data.json` |
| Confidence data | `assets/js/pwa-confidence-rating-data.json` |
| Related prompts | `prompts/standards-traceability.md`, `prompts/validation-library.md`, `prompts/aerospace-document-library.md`, `prompts/power-wire-analysis.md` |

---

## 3. Mandatory pre-work

Before researching or proposing integration:

1. **Check Document Library** — is the standard already registered in `manifest.json`? Which revision/amendment is on file?
2. **Check Standards Matrix** — are traceability rows already citing this standard?
3. **Check Validation Library** — do validation cases already reference this standard?
4. **Check engineering notes** — what does `power-wire-analysis-standards.html` and help already state?
5. **Identify research source** — registered PDF in `reference/documents/files/`, Easy Access Rules, or external source requiring Design Authority confirmation.

**Prefer on-repo registered documents** over external-only references. Flag unregistered standards for Document Library addition.

---

## 4. Per-standard research requirements

For **every standard** researched, identify and document:

| Element | Description |
|---------|-------------|
| **Purpose** | Why the standard exists; problem it addresses; regulatory or industry context |
| **Scope** | Aircraft categories, systems, equipment types, and exclusions |
| **Key Requirements** | Binding or recommended requirements relevant to toolkit scope (EWIS, electrical, environmental, safety) |
| **Design Implications** | What the design engineer must do differently — sizing, margins, routing, limits, assumptions |
| **Verification Requirements** | Analysis, test, inspection, or documentation needed to substantiate compliance |

### 4.1 Research outputs to generate

For each standard, produce four derived artefacts:

| Artefact | Content |
|----------|---------|
| **Executive Summary** | ≤ 250 words: what the standard is, who it applies to, toolkit relevance |
| **Clause Summary** | Table of key clauses/sections with one-line engineering interpretation each |
| **Engineering Guidance** | Practical design and analysis guidance for toolkit users; what the calculator uses vs does not cover |
| **Toolkit Integration Opportunities** | Specific updates to calculators, validation cases, traceability rows, notes, or document library |

### 4.2 Clause summary table format

| Clause / section | Title | Engineering interpretation | Toolkit relevance |
|------------------|-------|--------------------------|-------------------|
| CS 25.1309 | Equipment, systems… | Safety assessment required for systems | Traceability row; not calculated directly |
| ARP4404 §9.3.4.2 | Voltage drop | Allowable drop U by nominal voltage | PWA voltage drop row |

Mark clauses as **Directly implemented**, **Referenced only**, **Not yet implemented**, or **Out of toolkit scope**.

### 4.3 Integration opportunity categories

Classify each opportunity:

| Category | Example |
|----------|---------|
| **Calculator enhancement** | New parameter, formula, or limit check |
| **Traceability row** | New matrix entry with Standard, Clause, Applicability |
| **Validation case** | Benchmark case from standard example or table |
| **Engineering note** | Help or standards page paragraph |
| **Document Library** | Register PDF; add manifest metadata |
| **Confidence rating** | New item or revised evidence source |
| **Deferred** | Relevant but out of current scope — document rationale |

---

## 5. Linking requirements

Every research finding that affects toolkit behaviour shall be linked to:

### 5.1 Calculators

- Identify affected calculator pages and JS modules.
- State which inputs, outputs, or assumptions the standard governs.
- Propose `linkedCalculators` paths for Document Library entries.

### 5.2 Validation Library

- Propose validation cases with Source Standard and Source Clause from research.
- Identify reference data (tables, examples, datasheets) suitable for validation templates.
- Note cases requiring measured or Design Authority-approved data.

### 5.3 Standards Matrix

- Propose traceability rows: `functionName`, `toolAction`, `standard`, `clause`, `revision`, `applicability`, `complianceNotes`.
- Assign traceability level A–E per `prompts/standards-traceability.md`.
- Set `documentLibraryId` when manifest entry exists.

### 5.4 Engineering Notes

- Propose updates to `power-wire-analysis-standards.html`, help pages, or inline `pwa-guide` sections.
- Follow Technical Author conventions: purpose, used for, does **not** define.
- Include disclaimers: not certification limits unless Design Authority accepted.

---

## 6. Required output structure

When executing this prompt, produce the following sections **in order** for each standard researched:

---

### 6.1 Standard Overview

| Field | Content |
|-------|---------|
| Standard designation | e.g. SAE ARP4404C, EASA CS-25 Amendment 24 |
| Authority | EASA, FAA, RTCA, SAE, MIL, Company |
| Revision / date | Issue, amendment, or edition |
| Document Library ID | Manifest `id` if registered; else `Not registered — recommend addition` |
| **Purpose** | Full paragraph |
| **Scope** | Aircraft categories, systems, applicability limits |
| **Executive Summary** | ≤ 250 words |

---

### 6.2 Key Clauses

**Clause Summary** table (§4.2) listing:

- Clause / section reference
- Title
- Key requirement (concise)
- Engineering interpretation
- Toolkit relevance (Directly implemented / Referenced / Not implemented / Out of scope)

Highlight clauses that:

- Govern wire sizing, ampacity, voltage drop, or EWIS
- Define environmental or altitude requirements
- Require safety assessment or verification evidence
- Are cited by existing traceability rows (confirm or correct)

---

### 6.3 Engineering Impact

Synthesise **Design Implications** and **Verification Requirements**:

| Area | Design implications | Verification requirements |
|------|---------------------|---------------------------|
| Wire sizing / ampacity | | |
| Voltage drop | | |
| Installation / EWIS | | |
| Environmental / altitude | | |
| Safety / systems | | |
| Documentation / substantiation | | |

Include **Engineering Guidance** prose (§4.1) covering:

- What toolkit users should confirm with Design Authority
- What the standard defines vs what remains project-specific
- Conservative assumptions and safety margins
- Gaps between standard requirements and current calculator coverage

---

### 6.4 Recommended Toolkit Updates

Prioritised **Toolkit Integration Opportunities** (§4.3):

| Priority | Category | Update | Files affected | Effort |
|----------|----------|--------|----------------|--------|
| P1 | Traceability row | | `pwa-standards-traceability-data.json` | S/M/L |
| P1 | Engineering note | | `power-wire-analysis-standards.html` | S/M/L |
| P2 | Validation case | | `pwa-validation-library-data.json` | S/M/L |
| P2 | Document Library | | `manifest.json` | S/M/L |
| P3 | Calculator enhancement | | `pwa-grid-calculator.js` | S/M/L |
| P3 | Confidence rating | | `pwa-confidence-rating-data.json` | S/M/L |

For each recommendation include:

- Engineering rationale (why the update is correct)
- Validation method (how to verify after implementation)
- Dependencies (document must be registered first, etc.)

Separate **implement now** from **defer** with documented rationale.

---

### 6.5 Traceability References

Provide ready-to-use traceability records:

| itemId | functionName | standard | clause | revision | applicability | complianceNotes | traceabilityLevel | documentLibraryId |
|--------|--------------|----------|--------|----------|---------------|-----------------|-------------------|-------------------|

Cross-reference map:

| Standard clause | Calculator function | Validation ID | Engineering note location |
|-----------------|---------------------|---------------|---------------------------|
| | | | |

List reverse-traceability: all toolkit items that should cite this standard after integration.

---

## 7. Acceptance criteria

Research and integration planning is complete when:

1. **Standard Overview** includes Purpose, Scope, and Executive Summary for each standard researched.
2. **Key Clauses** table covers all toolkit-relevant sections with engineering interpretation.
3. **Engineering Impact** documents design implications and verification requirements.
4. **Recommended Toolkit Updates** are prioritised with specific files and categories.
5. **Traceability References** provide matrix-ready rows with clause-level detail.
6. Findings are linked to Calculators, Validation Library, Standards Matrix, and Engineering Notes.
7. Unregistered documents are flagged for `prompts/aerospace-document-library.md` workflow.
8. No compliance claims are made without Design Authority caveat.
9. Clause references are specific (not generic "per standard"); use `TBD — Design Authority` only when clause not yet confirmed.
10. Outputs distinguish **Directly implemented**, **Referenced**, **Not implemented**, and **Out of scope**.

---

## 8. Research quality rules

| Rule | Requirement |
|------|-------------|
| **Source priority** | Registered repo PDF → official authority publication → recognised secondary reference |
| **No verbatim copying** | Summarise requirements; cite clause numbers; do not reproduce copyrighted text at length |
| **Applicability caveats** | State aircraft category, modification status, and certification basis dependencies |
| **Calculator honesty** | Clearly state what the toolkit implements vs what requires external analysis |
| **Evidence grading** | Note whether requirements are regulatory (A), industry standard (B), or guidance (C/D) |
| **Consistency** | Align with existing traceability rows; flag contradictions for resolution |
| **Actionable output** | Every key clause maps to an integration opportunity or explicit deferral |

---

## 9. Deliverables checklist

### Research outputs (per standard)
- [ ] Standard Overview (§6.1)
- [ ] Key Clauses / Clause Summary (§6.2)
- [ ] Engineering Impact + Engineering Guidance (§6.3)
- [ ] Recommended Toolkit Updates (§6.4)
- [ ] Traceability References (§6.5)

### Integration artefacts (when implementation follows)
- [ ] Document Library manifest entry (`aerospace-document-library.md`)
- [ ] Traceability rows (`standards-traceability.md`)
- [ ] Validation cases (`validation-library.md`)
- [ ] Engineering note updates (`power-wire-analysis.md` / standards page)
- [ ] Confidence rating updates (`confidence-rating-system.md`)
- [ ] Generator scripts run (`gen-traceability-static.js`, etc.)

---

## Execution instructions for Cursor

When invoked with this prompt:

1. **Assume all three roles** (§Role) in research and writing.
2. **Inspect first** — Check Document Library, traceability data, and existing engineering notes before researching.
3. **One standard at a time** — Complete §6.1–§6.5 for each standard before moving to the next.
4. **Produce integration-ready output** — Traceability rows and validation case stubs should be copy-ready for JSON files.
5. **Link everything** — No orphan findings; every clause with toolkit relevance maps to a calculator, matrix row, validation case, or note.
6. **Register documents** — If standard PDF is available, propose manifest entry per `aerospace-document-library.md`.
7. **Do not overclaim** — Summarise requirements; disclaim compliance determination.
8. **Prioritise** — P1 = safety-critical or already-cited gaps; P2 = assurance completeness; P3 = enhancements.
9. **Summarise** — End with count of clauses reviewed, integration opportunities, deferred items, and unregistered documents.

---

*Engineering Knowledge Hub — Aerospace Engineering Toolkit — Standards Research prompt v1.0*
