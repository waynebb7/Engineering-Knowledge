# Engineering Audit — Reusable Cursor Prompt

Use this prompt whenever performing a **full engineering audit** of the **Aerospace Engineering Toolkit** within the Engineering Knowledge Hub repository.

---

## 1. Purpose

Conduct a structured, repeatable **engineering audit** of the Aerospace Engineering Toolkit to assess technical correctness, assurance completeness, usability, and operational readiness. The audit shall produce a formal report suitable for engineering review, Design Authority consideration, and prioritised remediation planning.

**Primary goals:**

- Verify engineering accuracy and mathematical correctness of calculators and reference content.
- Assess unit consistency, standards traceability, and validation evidence coverage.
- Evaluate mobile and desktop compatibility, accessibility, navigation, and user experience.
- Identify broken links and structural defects affecting auditability or trust.
- Classify all findings by severity and produce a clear **Pass / Fail** determination.

**Guiding principle:** The audit evaluates engineering quality and assurance posture. It does not constitute certification approval, compliance finding, or Design Authority acceptance.

---

## 2. Scope

### 2.1 Audit target

The **Aerospace Engineering Toolkit** and its assurance ecosystem within the Engineering Knowledge Hub:

| Area | Location |
|------|----------|
| Aerospace calculators | `calculators/aerospace-electrical-design/` |
| PWA calculator modules | `assets/js/pwa-*.js` |
| Standards Traceability | `assets/js/pwa-standards-traceability.js`, `*-standards-traceability-data.json` |
| Validation Library | `assets/js/pwa-validation-library.js`, `*-validation-library-data.json` |
| Confidence Rating | `assets/js/pwa-confidence-rating.js`, `*-confidence-rating-data.json` |
| Document Library | `reference/documents/`, `assets/js/documents-library.js` |
| Standards reference pages | e.g. `power-wire-analysis-standards.html`, help pages |
| Shared design system | `assets/css/corporate.css`, `assets/js/site-layout.js` |
| Report / workbook export | `assets/js/pwa-workbook.js`, `assets/js/pwa-word-report.js` |
| Related prompts | `prompts/validation-library.md`, `prompts/standards-traceability.md`, `prompts/confidence-rating-system.md` |

### 2.2 Audit dimensions

The audit shall review all of the following:

1. **Engineering accuracy** — formulae, assumptions, limits, disclaimers, and engineering interpretation align with cited standards and recognised practice.
2. **Mathematical correctness** — calculator implementations produce results consistent with documented equations and reference cases.
3. **Unit consistency** — inputs, outputs, labels, and conversions use coherent SI/US customary units without silent mismatches.
4. **Standards traceability** — every major function, assumption, and output maps to Standard, Clause, Revision, Applicability, and Compliance Notes (see `prompts/standards-traceability.md`).
5. **Validation evidence** — validation cases exist, run correctly, and record Pass / Pass with Limitations / Review Required / Fail status (see `prompts/validation-library.md`).
6. **Mobile compatibility** — layout, controls, and tables usable at ≥ 320px without critical content loss.
7. **Desktop compatibility** — full functionality and readability at ≥ 1024px.
8. **Accessibility** — semantic HTML, ARIA usage, keyboard operation, contrast, and `<noscript>` fallbacks.
9. **Navigation** — global nav, back links, subnav, breadcrumbs, and hub links function correctly.
10. **Broken links** — internal hrefs, asset references, and manifest links resolve.
11. **User experience** — workflow clarity, help content, error messages, loading states, and engineering guidance quality.

### 2.3 Out of scope

- Formal regulatory compliance certification.
- Live flight-test or laboratory verification unless validation cases already exist.
- Non-aerospace learning content (`learn/`) unless directly referenced by aerospace calculators.

---

## 3. Audit methodology

### 3.1 Mandatory preparation

Before auditing, review:

1. `PROJECT-STRUCTURE.md` — repository layout and conventions.
2. Reference calculator: `calculators/aerospace-electrical-design/power-wire-analysis.html` and associated JS modules.
3. Assurance modules: traceability, validation, and confidence data files and UI sections.
4. Related reusable prompts in `prompts/`.

### 3.2 Automated checks (run and record results)

Execute available tooling and include outcomes in the audit report:

| Check | Command |
|-------|---------|
| JavaScript syntax | `node --check assets/js/<file>.js` (all modified or in-scope JS) |
| Internal links (core) | `python scripts/check-links.py --scope core` |
| Internal links (full) | `python scripts/check-links.py --scope all` |
| Redirect stubs | `python scripts/verify-redirect-stubs.py` |
| Generated artifact drift | Regenerate catalog/manifest scripts per CI; note any `git diff` |
| Traceability static sync | `node scripts/gen-traceability-static.js` |
| Validation static sync | `node scripts/gen-validation-static.js` |
| Confidence static sync | `node scripts/gen-confidence-static.js` |

Record pass/fail and error output for each automated check.

### 3.3 Manual review procedures

#### Engineering accuracy and mathematical correctness

- Read calculator help, standards reference, and embedded formulae.
- Trace each major output back to its implementing function in JS.
- Run calculator with boundary and representative inputs; compare against documented behaviour.
- Cross-check validation cases: Expected Result vs Calculated Result and Error Percentage.
- Flag undocumented assumptions, missing limits, or misleading disclaimers.

#### Unit consistency

- Verify input labels, grid headers, and result units match implementation.
- Check conversion factors (ft/m, °C/°F, AWG, altitude, pressure altitude effects).
- Confirm unit suffixes in results and export reports.

#### Standards traceability

- Confirm Standards Traceability Matrix exists and is populated.
- Verify each row has Standard, Clause, Revision, Applicability, Compliance Notes (or documented TBD).
- Check reverse-traceability: cited standards link back to dependent items.
- Compare traceability rows against Document Library manifest entries.

#### Validation evidence

- Confirm Validation Library section exists with built-in and/or user cases.
- Verify required fields per case: Validation ID, inputs, expected/calculated results, error %, status.
- Note cases marked Review Required, Fail, or unpopulated templates.
- Assess whether validation coverage matches safety-critical outputs.

#### Mobile, desktop, accessibility, navigation, UX

- Review responsive CSS breakpoints in `corporate.css` for in-scope components.
- Verify `pwa-trace-cards`, `pwa-conf-cards`, and table scroll containers on narrow viewports.
- Check `aria-label`, `aria-live`, `role="note"`, `<th scope>`, focus order, and touch target sizes.
- Verify `site-layout.js` nav, `back-link`, `pwa-subnav`, and hub breadcrumbs.
- Assess workflow: how-to guides, parameter tooltips, error messages, export flows.

### 3.4 Finding classification

Classify every finding using exactly one severity:

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | Incorrect engineering result, safety-critical defect, broken core calculator function, or missing disclaimer on compliance-sensitive output. Immediate remediation required before formal engineering use. | Wrong formula producing unsafe wire sizing; validation Fail on safety-critical output ignored; calculator returns NaN for valid inputs |
| **Major** | Significant gap in traceability, validation, units, accessibility, or navigation that impairs auditability or reliable use. Remediation required before release milestone. | Missing traceability for safety-critical function; no validation cases for primary outputs; broken subnav on all aerospace pages |
| **Minor** | Localised defect with workaround; incomplete metadata; cosmetic or non-blocking UX issue. Remediation recommended. | Single broken link; inconsistent unit label; missing `aria-label` on one control |
| **Observation** | Improvement opportunity; informational note; best-practice suggestion. No immediate remediation required. | Additional validation case suggested; help text could be clearer; optional reverse-traceability enhancement |

Each finding shall include:

- **Finding ID** — stable identifier (e.g. `AUD-2026-001`)
- **Severity** — Critical | Major | Minor | Observation
- **Category** — one of the eleven audit dimensions (§2.2)
- **Location** — file path, page URL, function/module name
- **Description** — what was found
- **Evidence** — test input, command output, screenshot note, or code reference
- **Impact** — effect on engineering accuracy, assurance, or user trust

---

## 4. Audit report structure

Produce the audit report with the following sections **in order**:

---

### 4.1 Executive Summary

A concise overview (≤ 300 words) containing:

- Audit date and scope (toolkit version / commit hash if available)
- Overall **Pass / Fail** status with one-sentence justification
- Count of findings by severity (Critical / Major / Minor / Observation)
- Top three risks requiring attention
- Summary of automated check results
- One-paragraph assurance posture statement (traceability, validation, confidence coverage)

---

### 4.2 Findings

List all findings grouped by severity (Critical first, then Major, Minor, Observation).

Use this table format for each finding:

| Field | Value |
|-------|-------|
| Finding ID | AUD-YYYY-NNN |
| Severity | Critical / Major / Minor / Observation |
| Category | Engineering accuracy / Mathematical correctness / Unit consistency / Standards traceability / Validation evidence / Mobile compatibility / Desktop compatibility / Accessibility / Navigation / Broken links / User experience |
| Location | `path/to/file` or page |
| Description | Clear statement of the issue |
| Evidence | Test result, command output, or observation |
| Impact | Engineering or operational consequence |

If no findings exist in a severity band, state: *No [severity] findings identified.*

---

### 4.3 Risk Assessment

Assess cumulative risk across the toolkit:

| Risk area | Rating (High / Medium / Low) | Rationale |
|-----------|------------------------------|-----------|
| Engineering accuracy | | |
| Mathematical correctness | | |
| Unit consistency | | |
| Standards traceability | | |
| Validation evidence | | |
| Assurance integration (traceability + validation + confidence) | | |
| Usability (mobile + desktop + UX) | | |
| Accessibility | | |
| Site integrity (links + navigation) | | |
| **Overall engineering risk** | | |

Include a short narrative (≤ 200 words) on whether the toolkit is suitable for:

- Preliminary engineering assessment
- Internal engineering review
- Formal submission (requires Design Authority acceptance)

---

### 4.4 Recommended Actions

For each **Critical** and **Major** finding, provide a recommended action:

| Finding ID | Recommended action | Owner suggestion | Estimated effort |
|------------|-------------------|------------------|------------------|
| AUD-… | Specific remediation step | Engineering / Dev / Content | S / M / L |

For **Minor** findings, summarise remediation in a bulleted list.
For **Observations**, note as optional improvements.

Recommended actions shall be concrete and file-specific where possible (e.g. "Add validation case `pwa-val-006` for bundle derating in `pwa-validation-library-data.json`").

---

### 4.5 Priority Ranking

Produce a prioritised remediation backlog:

| Priority | Finding ID | Severity | Category | Action summary | Target |
|----------|------------|----------|----------|----------------|--------|
| P1 | | Critical | | | Immediate |
| P2 | | Major | | | Next sprint |
| P3 | | Minor | | | Backlog |
| P4 | | Observation | | | Optional |

**P1** — all Critical findings, ordered by safety impact.
**P2** — all Major findings, ordered by assurance and usability impact.
**P3** — Minor findings batched by category.
**P4** — Observations for future enhancement.

---

### 4.6 Pass / Fail Status

State the overall audit result using these rules:

| Status | Criteria |
|--------|----------|
| **PASS** | Zero Critical findings; zero Major findings in engineering accuracy, mathematical correctness, or unit consistency; automated link and syntax checks pass; traceability and validation modules present on reference calculator |
| **PASS WITH CONDITIONS** | Zero Critical findings; Major findings only in traceability, validation, accessibility, or UX (not in core calculation correctness); remediation plan documented with P1/P2 actions and target dates |
| **FAIL** | One or more Critical findings; OR any Major finding in engineering accuracy, mathematical correctness, or unit consistency; OR automated core link check fails; OR calculator mathematics demonstrably incorrect |

Report format:

```
Overall Status: PASS | PASS WITH CONDITIONS | FAIL

Justification: [2–3 sentences citing finding counts and highest-severity issues]

Blocking issues: [List Finding IDs that prevent Pass, or "None"]

Conditions for upgrade to Pass: [If PASS WITH CONDITIONS, list required closures]
```

---

## 5. Acceptance criteria for the audit itself

The audit is complete when:

1. All eleven audit dimensions (§2.2) have been explicitly reviewed and noted in the report.
2. All automated checks (§3.2) have been run and results recorded.
3. Every finding has a unique ID, severity, category, location, description, evidence, and impact.
4. The report contains all six sections: Executive Summary, Findings, Risk Assessment, Recommended Actions, Priority Ranking, Pass / Fail Status.
5. Pass / Fail status follows the rules in §4.6 with explicit justification.
6. Critical and Major findings have corresponding recommended actions and priority entries.
7. Assurance modules (traceability, validation, confidence) are assessed against their respective prompts in `prompts/`.
8. Mobile (~375px) and desktop (~1280px) compatibility are explicitly addressed in findings or marked satisfactory.

---

## 6. Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Audit report** | Complete document with §4.1–§4.6 sections |
| **Finding register** | Table of all findings with IDs and severities |
| **Automated check log** | Command outputs for link checks, syntax checks, generator scripts |
| **Coverage matrix** | Checklist showing each audit dimension reviewed (pass / fail / N/A) |
| **Remediation backlog** | Priority-ranked action list (§4.5) |

Optional deliverables when requested:

- Per-calculator audit summary (one page per tool)
- Validation case gap analysis
- Traceability completeness score (% of functions traced)

---

## 7. Coverage matrix template

Complete this matrix in the audit report:

| Audit dimension | Reviewed | Result | Finding IDs |
|-----------------|----------|--------|-------------|
| Engineering accuracy | ☐ | Pass / Fail | |
| Mathematical correctness | ☐ | Pass / Fail | |
| Unit consistency | ☐ | Pass / Fail | |
| Standards traceability | ☐ | Pass / Fail | |
| Validation evidence | ☐ | Pass / Fail | |
| Mobile compatibility | ☐ | Pass / Fail | |
| Desktop compatibility | ☐ | Pass / Fail | |
| Accessibility | ☐ | Pass / Fail | |
| Navigation | ☐ | Pass / Fail | |
| Broken links | ☐ | Pass / Fail | |
| User experience | ☐ | Pass / Fail | |

---

## Execution instructions for Cursor

When invoked with this prompt:

1. **Read first** — Review `PROJECT-STRUCTURE.md`, the reference PWA calculator, and assurance modules before auditing.
2. **Run automated checks** — Execute all commands in §3.2; capture output.
3. **Audit systematically** — Walk through each dimension in §2.2; do not skip dimensions.
4. **Classify rigorously** — Apply §3.4 severity rules; err toward higher severity for safety-critical calculator outputs.
5. **Evidence-based** — Every finding must cite a file, test, or command result.
6. **Produce the report** — Output all six sections in §4 order using the specified formats.
7. **Determine status** — Apply §4.6 Pass / Fail rules; do not award Pass if Critical findings exist.
8. **Prioritise** — Rank remediation by safety and assurance impact, not cosmetic convenience.
9. **Cross-reference prompts** — Note gaps against `validation-library.md`, `standards-traceability.md`, and `confidence-rating-system.md`.
10. **Summarise** — End with overall status, finding counts, and top three priority actions.

---

*Engineering Knowledge Hub — Aerospace Engineering Toolkit — Engineering Audit prompt v1.0*
