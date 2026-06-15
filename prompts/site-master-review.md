# Site Master Review — Reusable Cursor Prompt

Use this prompt whenever performing a **complete strategic and technical review** of the **Aerospace Engineering Toolkit** and the broader **Engineering Knowledge Hub** within this repository.

---

## Role

Act simultaneously as:

| Role | Responsibility |
|------|----------------|
| **Principal Engineer** | Engineering correctness, standards coverage, calculator utility, technical debt in analysis logic |
| **UX Designer** | Navigation, workflows, mobile/desktop experience, information architecture, visual consistency |
| **Software Architect** | Repository structure, module boundaries, build pipeline, scalability, maintainability |
| **Technical Author** | Help content, engineering notes, clarity of guidance, documentation completeness |
| **Certification Engineer** | Traceability, validation, confidence posture, standards gaps, audit readiness |

Synthesise perspectives into one coherent review. Flag conflicts between roles (e.g. UX simplification vs assurance completeness) and recommend resolution.

---

## 1. Purpose

Perform a **complete master review** of the Aerospace Engineering Toolkit — assessing site health, engineering quality, user experience, architecture, and strategic direction — and produce an actionable roadmap for improvement.

**Primary goals:**

- Evaluate the full site across structure, content, calculators, documents, references, and learning material.
- Assess mobile and desktop experience, performance, and accessibility.
- Identify technical debt, duplication, and assurance gaps (missing standards, validation, traceability).
- Deliver a SWOT-informed strategic plan with quick wins and long-term direction.

**Relationship to other prompts:**

| Prompt | Focus |
|--------|-------|
| `engineering-audit.md` | Deep engineering assurance audit with Pass/Fail and classified findings |
| `site-master-review.md` | Holistic site review with strategic roadmap (this prompt) |
| `mobile-app-conversion.md` | Commercial mobile product planning |
| `aerospace-standards-research.md` | Individual standard research and integration |

Run `engineering-audit.md` for assurance depth; use this prompt for whole-site strategic review. Cross-reference findings; do not duplicate effort without adding strategic context.

**Guiding principle:** The review evaluates quality and direction. It does not constitute certification approval or compliance determination.

---

## 2. Scope

### 2.1 Review areas

The master review shall examine all of the following:

| Area | Location | Review focus |
|------|----------|--------------|
| **Site structure** | `PROJECT-STRUCTURE.md`, top-level folders | Organisation, conventions, discoverability |
| **Navigation** | `index.html`, `site-layout.js`, section indexes | Global nav, breadcrumbs, back links, subnav |
| **Calculators** | `calculators/`, `calculator-core.js`, `calculator-registry.js`, `pwa-*.js` | Coverage, architecture, aerospace vs general EE |
| **Documents** | `reference/documents/`, `manifest.json`, `documents-library.js` | Registration, metadata, search, cross-links |
| **References** | `reference/electrical/`, `reference/physics/`, etc. | Equations, variables, traceability |
| **Learning content** | `learn/`, `maps/`, `legacy/` | Scale, quality, relationship to aerospace toolkit |
| **Mobile experience** | `corporate.css` breakpoints, `pwa-*` cards | Layout, touch, grid scroll, assurance panels |
| **Desktop experience** | Wide layouts, tables, multi-column grids | Readability, workflow efficiency |
| **Performance** | Asset sizes, script count, MathJax, PDF loading | Load time, offline potential, CI build time |
| **Accessibility** | Semantic HTML, ARIA, contrast, keyboard, noscript | WCAG 2.1 AA intent |

### 2.2 Assessment dimensions

Explicitly assess:

| Dimension | Questions |
|-----------|-----------|
| **Technical debt** | Duplicated logic, stale generators, redirect stubs, drift risk, monolithic files |
| **Duplication** | Parallel patterns (multiple calculator frameworks, repeated CSS, copy-paste HTML) |
| **Missing features** | AC/DC gaps, export gaps, calculator catalogue holes, no PWA install |
| **Missing standards** | CS/AMC/FAA/RTCA/SAE/MIL cited but not in Document Library or traceability |
| **Missing validation** | Calculators without validation cases; unpopulated templates |
| **Missing traceability** | Functions without matrix rows; equations without source clauses |

### 2.3 Repository map (mandatory reading)

Before reviewing, read:

| Resource | Path |
|----------|------|
| Project structure | `PROJECT-STRUCTURE.md` |
| Site hub | `index.html` |
| Calculator hub | `calculators/index.html` |
| Aerospace section | `calculators/aerospace-electrical-design/index.html` |
| Flagship calculator | `calculators/aerospace-electrical-design/power-wire-analysis.html` |
| Document Library | `reference/documents/index.html`, `manifest.json` |
| Design system | `assets/css/corporate.css` |
| Navigation | `assets/js/site-layout.js` |
| CI pipeline | `.github/workflows/ci.yml` |
| Prompt library | `prompts/` |
| Assurance data | `pwa-standards-traceability-data.json`, `pwa-validation-library-data.json`, `pwa-confidence-rating-data.json` |

---

## 3. Review methodology

### 3.1 Automated checks (run and record)

| Check | Command | Record |
|-------|---------|--------|
| JS syntax | `node --check assets/js/*.js` (sample or full) | Pass/fail count |
| Link integrity (core) | `python scripts/check-links.py --scope core` | Broken link count |
| Link integrity (full) | `python scripts/check-links.py --scope all` | Broken link count |
| Redirect stubs | `python scripts/verify-redirect-stubs.py` | Pass/fail |
| Manifest build | `python scripts/build-documents-manifest.py` | Document count |
| Generated artifact drift | CI regen scripts per `ci.yml` | Drift yes/no |
| Assurance generators | `node scripts/gen-*-static.js` | Pass/fail |

### 3.2 Manual review by role

#### Principal Engineer
- Calculator formula alignment with standards (ARP4404, AC 43.13, etc.)
- Unit consistency across aerospace and general calculators
- Safety-critical disclaimers and installation vs survival temperature distinction

#### UX Designer
- Hub → section → tool journey (≤ 3 clicks to flagship PWA?)
- Mobile card layouts vs desktop tables for assurance sections
- Filter/search discoverability in Document Library
- Consistency of `page-hero`, `card-grid`, `pwa-subnav`, `back-link`

#### Software Architect
- `calculator-registry.js` vs `pwa-*` module split — sustainable?
- JSON + generator + HTML embed sync pattern — consistent?
- Script loading on flagship page (20+ deferred scripts) — bundling opportunity?
- CI guardrails and `PROJECT-STRUCTURE.md` accuracy

#### Technical Author
- Help page completeness (`power-wire-analysis-help.html`)
- Standards reference clarity (`power-wire-analysis-standards.html`)
- Engineering notes: purpose / used for / does not define pattern
- Prompt library README currency

#### Certification Engineer
- Traceability matrix coverage % on flagship calculator
- Validation case population (templates vs validated)
- Confidence rating completeness
- Document Library registration of cited standards
- Audit export paths (workbook, Word report)

### 3.3 Coverage scoring (optional but recommended)

Score each review area 1–5 (1 = poor, 5 = excellent):

| Area | Score | Evidence |
|------|-------|----------|
| Site structure | | |
| Navigation | | |
| Calculators | | |
| Documents | | |
| References | | |
| Learning content | | |
| Mobile experience | | |
| Desktop experience | | |
| Performance | | |
| Accessibility | | |
| Traceability | | |
| Validation | | |
| Confidence | | |

---

## 4. Required output structure

Produce the following sections **in order**:

---

### 4.1 Executive Summary

≤ 400 words covering:

- Review date and repository scope (commit hash if available)
- Overall site health rating (Excellent / Good / Fair / Needs attention)
- Top three strengths and top three weaknesses
- Strategic recommendation in one sentence
- Assurance posture summary (traceability, validation, confidence maturity)
- Highest-priority action for the next 30 days

---

### 4.2 Strengths

Bulleted list grouped by category:

| Category | Example strengths to look for |
|----------|------------------------------|
| Engineering | ARP4404 alignment, modular derating, workbook round-trip |
| Architecture | JSON-driven assurance, generator scripts, CI drift checks |
| UX | Responsive assurance cards, collapsible details sections, subnav |
| Content | Document Library with version picker, help/standards pages |
| Assurance | Full traceability/validation/confidence on flagship PWA |
| Operations | GitHub Pages deploy, link checker, redirect stub compatibility |

Each strength shall cite evidence (file path, feature, or metric).

---

### 4.3 Weaknesses

Bulleted list grouped by category:

| Category | Example weaknesses to look for |
|----------|-------------------------------|
| Technical debt | 20+ script tags on one page, duplicate calculator patterns |
| Duplication | Overlapping EE calculators at root and `calculators/` |
| Missing features | No AC three-phase in PWA; no installable PWA manifest |
| Missing standards | FAA/MIL groups absent from Document Library |
| Missing validation | Template-only cases; calculators without validation |
| Missing traceability | General calculators lack matrix; equations lack clauses |
| UX | Learning catalogue size vs aerospace focus confusion |
| Performance | MathJax on every page; large PDF manifest |
| Accessibility | Gaps in aria-live, focus order, noscript coverage |

Rate each weakness: **Critical** / **Major** / **Minor**.

---

### 4.4 Opportunities

Forward-looking improvements:

| Opportunity | Category | Effort | Impact |
|-------------|----------|--------|--------|
| | Engineering / UX / Commercial / Assurance | S/M/L | H/M/L |

Include:

- Aerospace calculator expansion (TRU, battery, bus load assurance parity)
- Standards research pipeline (`aerospace-standards-research.md`)
- Mobile app path (`mobile-app-conversion.md`)
- Shared assurance framework for all aerospace calculators
- Learning content cross-link to aerospace tools
- Document Library authority filter and cross-references

---

### 4.5 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Engineering incorrectness undetected | | | Validation Library expansion |
| Users treat calculator as certification tool | | | Disclaimers, confidence ratings |
| Technical debt blocks mobile conversion | | | Bundling, module consolidation |
| Document licensing issues | | | Manifest governance |
| CI drift / broken links on deploy | | | Existing CI; expand scope |
| Scope creep (learning vs aerospace) | | | Clear hub positioning |

Include **assurance risks** (missing traceability on safety-critical outputs) and **operational risks** (maintainability, bus factor).

---

### 4.6 Prioritised Development Roadmap

Phased roadmap with repository-linked tasks:

| Priority | Phase | Timeframe | Goals | Key files / prompts |
|----------|-------|-----------|-------|---------------------|
| P1 | Assurance parity | 0–3 mo | Extend traceability/validation to all aerospace calcs | `prompts/validation-library.md`, `standards-traceability.md` |
| P1 | Document gaps | 0–3 mo | Register missing FAA/MIL/AMC docs | `aerospace-document-library.md` |
| P2 | UX/mobile pass | 3–6 mo | Flagship PWA mobile optimisation | `corporate.css`, `power-wire-analysis.html` |
| P2 | Calculator expansion | 3–6 mo | TRU, battery assurance modules | `power-wire-analysis.md` |
| P3 | Architecture | 6–12 mo | Bundle scripts, reduce duplication | `pwa-*.js`, build pipeline |
| P3 | Mobile product | 6–12 mo | PWA manifest or Capacitor shell | `mobile-app-conversion.md` |
| P4 | Learning integration | 12+ mo | Cross-links, not full mobile rewrite | `learn/`, hub tiles |

Each phase must include:

- Deliverables
- Acceptance criteria
- Dependencies
- Related prompt to invoke for implementation

---

### 4.7 Quick Wins

Actions completable in **≤ 2 weeks** with high impact:

| # | Quick win | Owner role | Files | Impact |
|---|-----------|------------|-------|--------|
| 1 | Update `prompts/README.md` with all prompts | Technical Author | `prompts/README.md` | Discoverability |
| 2 | | | | |
| 3 | | | | |

Criteria for quick wins: minimal risk, no calculator mathematics change, measurable improvement.

---

### 4.8 Long-Term Strategy

Narrative (≤ 500 words) covering:

- **Vision** — What the Aerospace Engineering Toolkit should become in 12–24 months
- **Positioning** — Relationship between aerospace toolkit and broader Engineering Knowledge Hub / learning content
- **Assurance maturity model** — Path from flagship PWA to all aerospace tools having traceability + validation + confidence
- **Platform strategy** — Web-first vs mobile app vs both (reference `mobile-app-conversion.md`)
- **Standards corpus** — Document Library as canonical aerospace standards hub
- **Commercial optionality** — Lite/Pro tiers without compromising engineering integrity
- **Governance** — Prompt-driven development, CI, audit cadence (`engineering-audit.md` quarterly?)

End with 3–5 strategic pillars (e.g. *Assurance-first engineering tools*, *Mobile-ready aerospace workflow*, *Canonical standards library*).

---

## 5. Gap analysis templates

Complete these tables in the review:

### 5.1 Calculator assurance coverage

| Calculator | Traceability | Validation | Confidence | Standards page |
|------------|--------------|------------|------------|----------------|
| Power Wire Analysis | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ |
| TRU Sizing | | | | |
| Battery Endurance | | | | |
| Aircraft Bus Load | | | | |
| General EE (`calculator-registry`) | | | | |

### 5.2 Standards family coverage

| Family | In Document Library | In traceability | In validation | Gap |
|--------|--------------------|-----------------|---------------|-----|
| CS-23/25/27/29 | | | | |
| AMC | | | | |
| FAA AC | | | | |
| RTCA | | | | |
| SAE | | | | |
| MIL | | | | |
| Company | | | | |

### 5.3 Technical debt register

| Item | Location | Severity | Remediation |
|------|----------|----------|-------------|
| | | | |

---

## 6. Acceptance criteria

The master review is complete when:

1. All ten review areas (§2.1) are explicitly addressed.
2. All six assessment dimensions (§2.2) are assessed with evidence.
3. Automated checks (§3.1) are run and results recorded.
4. Output contains all eight sections (§4.1–§4.8).
5. Gap analysis templates (§5) are populated or marked N/A with rationale.
6. Roadmap items link to specific files and prompts.
7. Quick wins are genuinely low-effort (≤ 2 weeks).
8. Long-term strategy distinguishes aerospace toolkit from full learning hub scope.
9. No compliance approval language; disclaimers acknowledged where tools could be misused.

---

## 7. Deliverables checklist

- [ ] Executive Summary (§4.1)
- [ ] Strengths (§4.2)
- [ ] Weaknesses (§4.3)
- [ ] Opportunities (§4.4)
- [ ] Risks (§4.5)
- [ ] Prioritised Development Roadmap (§4.6)
- [ ] Quick Wins (§4.7)
- [ ] Long-Term Strategy (§4.8)
- [ ] Coverage scores (§3.3)
- [ ] Gap analysis tables (§5)
- [ ] Automated check log

---

## Execution instructions for Cursor

When invoked with this prompt:

1. **Assume all five roles** (§Role) — synthesise, don't silo.
2. **Read first** — `PROJECT-STRUCTURE.md`, hub pages, flagship PWA, prompt library, assurance JSON files.
3. **Run automated checks** — §3.1; include results in Executive Summary.
4. **Be evidence-based** — Cite paths, counts, and scores; avoid generic praise or criticism.
5. **Differentiate from engineering audit** — Strategic and holistic; invoke `engineering-audit.md` for deep assurance Pass/Fail if needed.
6. **Prioritise aerospace toolkit** — Learning content reviewed for scope/positioning, not line-by-line unless blocking.
7. **Produce §4 in order** — All eight sections before suggesting implementation.
8. **Actionable roadmap** — Every P1 item has files and a related prompt.
9. **Honest quick wins** — Do not label multi-month work as quick wins.
10. **Summarise** — End with health rating, top P1 action, and recommended next prompt to run.

---

*Engineering Knowledge Hub — Aerospace Engineering Toolkit — Site Master Review prompt v1.0*
