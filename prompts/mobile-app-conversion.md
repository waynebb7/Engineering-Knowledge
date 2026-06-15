# Mobile App Conversion — Reusable Cursor Prompt

Use this prompt whenever **planning or executing conversion** of the **Aerospace Engineering Toolkit** into a **commercial mobile application** (native, hybrid, or installable PWA) within the Engineering Knowledge Hub repository context.

---

## 1. Purpose

Assess the existing web-based Aerospace Engineering Toolkit and produce a conversion strategy for a commercial mobile product — defining architecture, feature tiers, monetisation, store readiness, and UI adaptations while preserving engineering accuracy and assurance modules (traceability, validation, confidence).

**Primary goals:**

- Inventory existing website functionality and classify into Lite, Pro, Offline, and Premium tiers.
- Evaluate delivery options: **Android**, **iOS**, and **installable PWA**.
- Propose a technical architecture that reuses existing `pwa-*` calculator logic where possible.
- Define monetisation and app-store readiness without compromising engineering disclaimers.
- Produce an actionable development roadmap linked to repository artefacts.

**Guiding principle:** Mobile packaging must not weaken engineering traceability, validation evidence, or certification disclaimers. Commercial features shall not imply regulatory compliance or Design Authority approval.

---

## 2. Scope

### 2.1 Mandatory review (before any conversion plan)

Review the existing toolkit in full:

| Area | Location | Review focus |
|------|----------|--------------|
| **Website hub** | `index.html`, `assets/js/site-layout.js` | Navigation, branding, entry points |
| **Design system** | `assets/css/corporate.css` | Responsive breakpoints, `pwa-*` components |
| **Standard calculators** | `calculators/`, `assets/js/calculator-core.js`, `calculator-registry.js` | Shell + registry pattern; ~40 EE calculators |
| **Aerospace calculators** | `calculators/aerospace-electrical-design/` | PWA grid, TRU, battery, bus load |
| **PWA modules** | `assets/js/pwa-*.js` | Grid calc, thermal, workbook, reports, assurance |
| **References** | `reference/electrical/`, `reference/physics/`, etc. | Equations, variables |
| **Document Library** | `reference/documents/`, `documents-library.js`, `manifest.json` | PDF standards, search, filter |
| **Assurance modules** | Traceability, validation, confidence JSON + JS | Export, localStorage |
| **Learning content** | `learn/` | Scope for mobile (likely separate or premium) |
| **Deployment** | `.github/workflows/ci.yml` | GitHub Pages static hosting |
| **Project structure** | `PROJECT-STRUCTURE.md` | Architecture conventions |

### 2.2 Feature tier definitions

Classify every reviewed feature into exactly one primary tier (secondary tags allowed):

| Tier | Definition | Examples from toolkit |
|------|------------|----------------------|
| **Lite** | Free core calculators and reference suitable for field quick-check; limited exports; ads optional | Single-phase power, unit converters, basic Ohm's law, wire AWG lookup |
| **Pro** | Full aerospace workflow; assurance modules; project save; Excel/Word export | Power Wire Analysis grid, workbook import/export, traceability matrix, validation library |
| **Offline** | Functions without network after initial load or sync | Cached calculator JS, localStorage projects, bundled wire catalog, offline validation templates |
| **Premium** | Subscription or one-time unlock; high-value content or enterprise features | Full Document Library PDFs, advanced thermal/transient, multi-project cloud sync, team audit export |

### 2.3 Platform evaluation scope

Evaluate three delivery options:

| Platform | Assessment dimensions |
|----------|----------------------|
| **PWA** | Fastest path; reuse static site; service worker; install prompt; limited store presence |
| **Android** | Play Store; TWA or Capacitor/React Native wrapper; IAP; offline APK assets |
| **iOS** | App Store; Capacitor/native shell; IAP; stricter review; PDF/document handling |

### 2.4 Out of scope (unless explicitly requested)

- Rewriting all learning content (`learn/`) for mobile-first UX in v1.
- Claiming certification compliance in app store listings.
- Hosting copyrighted standards without licence verification.

---

## 3. Requirements

### 3.1 Feature identification

For each calculator, reference page, and document category, document:

| Attribute | Description |
|-----------|-------------|
| Feature name | User-visible capability |
| Source file(s) | HTML + JS paths |
| Tier | Lite / Pro / Offline / Premium |
| Network dependency | Online-only, offline-capable, hybrid |
| Assurance content | Traceability, validation, confidence present? |
| Export capability | None, PDF, Excel, Word, share sheet |
| Mobile readiness | Current responsive status; adaptation needed |

### 3.2 Platform evaluation criteria

Score each platform (1–5) against:

- Time to market
- Code reuse from existing repo
- Offline depth
- Store monetisation (IAP, subscription)
- Engineering PDF/document UX
- Assurance module portability
- Maintenance burden
- CI/CD fit with current GitHub Pages workflow

Recommend a **primary** and **fallback** platform strategy with rationale.

### 3.3 Technical architecture deliverables

Provide:

- **Client architecture** — shell app, WebView vs native UI, module bundling
- **Data layer** — localStorage migration, IndexedDB, SQLite, cloud sync
- **Asset strategy** — which JS bundles ship offline; wire catalog JSON; manifest PDFs
- **API layer** — if needed for Premium (auth, sync, licence validation); else explicit offline-first
- **Assurance portability** — traceability/validation/confidence in mobile context
- **Build pipeline** — extend existing CI or separate mobile repo
- **Security** — document storage, export files, no secrets in client

### 3.4 Monetisation strategy

Define:

| Model | Application |
|-------|-------------|
| Freemium (Lite free, Pro unlock) | Core EE calculators free; aerospace suite Pro |
| Subscription | Monthly/annual for Pro + Premium document access |
| One-time purchase | Lifetime Pro unlock |
| Enterprise | Team licence, audit export, custom standards packs |
| Non-monetised | Engineering disclaimers, open-source Lite tier |

Include pricing hypotheses, trial period, restore purchases, and regional store considerations.

**Prohibited claims:** Do not market as "FAA approved", "certified", or "compliance tool" in store copy.

### 3.5 Store readiness requirements

| Store | Requirements to address |
|-------|-------------------------|
| **Google Play** | Target API, privacy policy, data safety form, content rating, IAP setup, offline disclosure |
| **Apple App Store** | Privacy nutrition labels, IAP, export compliance, document viewer guidelines, review notes for engineering tool |
| **PWA** | Web app manifest, service worker, install UX, optional Trusted Web Activity for Play |

Include: privacy policy scope (localStorage, exports, analytics), terms of use, engineering disclaimer screen, support contact.

### 3.6 UI adaptations

Define mobile-specific UX changes:

- **Navigation** — bottom tab bar vs hamburger; aerospace section as primary Pro entry
- **Calculator layout** — PWA grid horizontal scroll; parameter panel as bottom sheet on phone
- **Touch targets** — min 44×44px; filter toolbars stack vertically
- **Assurance sections** — collapsible cards; summary badges on calculator result screen
- **Document viewer** — in-app PDF vs system viewer; Premium gating
- **Export/share** — native share sheet for Excel/Word exports from `pwa-workbook.js` / `pwa-word-report.js`
- **Onboarding** — Lite vs Pro explanation; offline mode indicator
- **Dark mode** — optional; align with `corporate.css` tokens

Preserve existing `corporate.css` design language where possible; document new mobile-only tokens.

---

## 4. Required output structure

When executing this prompt, produce the following sections **in order**:

---

### 4.1 App Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Provide architecture diagram (mermaid or ASCII) and    │
│  narrative covering:                                    │
│  - Shell (PWA / Capacitor / native)                     │
│  - Calculator engine layer (calculator-core, pwa-*)     │
│  - Assurance layer (traceability, validation, confidence)│
│  - Data & sync layer                                    │
│  - Document & asset layer                               │
│  - Monetisation / licence gate                          │
└─────────────────────────────────────────────────────────┘
```

Include:

| Component | Technology choice | Reuse from repo |
|-----------|-------------------|-----------------|
| App shell | | |
| Calculator runtime | | |
| Offline storage | | |
| Document access | | |
| Export engine | | |
| Auth / IAP | | |
| Analytics (optional) | | |

State recommended **primary platform** (PWA / Android / iOS / hybrid) and phased rollout.

---

### 4.2 Feature Matrix

Complete matrix for all reviewed features:

| Feature | Source | Lite | Pro | Offline | Premium | Mobile ready | Notes |
|---------|--------|------|-----|---------|---------|--------------|-------|
| Power Wire Analysis grid | `power-wire-analysis.html` | | ✓ | ✓ | | Partial | Grid scroll UX |
| Workbook export/import | `pwa-workbook.js` | | ✓ | ✓ | | | File picker on mobile |
| Document Library PDFs | `documents-library.js` | | | | ✓ | | Size/licensing |
| Unit converters | `calculators/converters/` | ✓ | | ✓ | | Yes | |
| … | | | | | | | |

Summarise counts: total features, per tier, offline-capable %, adaptation effort (S/M/L).

---

### 4.3 Lite vs Pro Comparison

User-facing comparison table for store and in-app upgrade screen:

| Capability | Lite (Free) | Pro |
|------------|-------------|-----|
| Standard EE calculators | ✓ | ✓ |
| Aerospace wire analysis | — | ✓ |
| AWG grid + thermal | — | ✓ |
| Workbook save/export | — | ✓ |
| Standards traceability | Read-only summary | Full matrix |
| Validation library | — | ✓ |
| Confidence rating | — | ✓ |
| Word report export | — | ✓ |
| Document Library | Index only | Full PDF access (Premium tier if split) |
| Offline projects | 1 saved circuit | Unlimited |
| Ads | Optional | None |

Add **Premium** column if subscription tier is separate from Pro.

Include engineering disclaimer text for both tiers.

---

### 4.4 Revenue Opportunities

| Opportunity | Model | Target user | Est. priority | Dependencies |
|-------------|-------|-------------|---------------|--------------|
| Pro unlock (aerospace suite) | One-time IAP | Wire design engineers | P1 | IAP SDK |
| Annual subscription | Subscription | EWIS teams | P1 | Backend optional |
| Premium document pack | Subscription add-on | Certification engineers | P2 | PDF licensing |
| Enterprise team licence | B2B | MRO, OEM | P3 | Auth, admin |
| White-label | Custom | Training providers | P4 | Separate build |

For each opportunity: price range hypothesis, conversion funnel (Lite → Pro), retention hook (saved projects, standards updates).

---

### 4.5 Development Roadmap

Phased roadmap with repository-linked tasks:

| Phase | Duration | Goals | Key deliverables |
|-------|----------|-------|------------------|
| **0 — Discovery** | 2–4 wk | Feature matrix, architecture decision | This prompt output |
| **1 — PWA foundation** | 4–6 wk | Manifest, service worker, offline shell | `manifest.webmanifest`, SW cache list |
| **2 — Lite app** | 6–8 wk | Free calculators + references mobile UX | Responsive pass, app shell UI |
| **3 — Pro aerospace** | 8–12 wk | PWA calculator + workbook on mobile | WebView optimisations, file I/O |
| **4 — Store launch** | 4–6 wk | Android TWA or Capacitor; iOS wrapper | Store listings, privacy policy |
| **5 — Premium** | Ongoing | Documents, sync, enterprise | Backend, IAP, document gating |

Per phase list:

- Repository files to create or modify
- Related prompts to invoke (`power-wire-analysis.md`, `aerospace-document-library.md`, etc.)
- Acceptance criteria
- Risks and mitigations

---

## 5. Integration with existing toolkit

Link mobile plans to assurance and content systems:

| System | Mobile consideration |
|--------|---------------------|
| **Calculators** | Bundle `pwa-grid-calculator.js` + deps for offline; lazy-load learning content |
| **Validation Library** | Offline built-in cases; user cases in IndexedDB |
| **Standards Matrix** | Ship static JSON; read-only in Lite |
| **Engineering Notes** | Help/standards pages as in-app WebView or native markdown |
| **Document Library** | Premium PDF cache; manifest-driven download manager |
| **Confidence Rating** | Persist overrides per project in local DB |

Cross-reference `prompts/engineering-audit.md` before store launch for assurance completeness.

---

## 6. Acceptance criteria

The conversion plan is complete when:

1. **Review completed** — Website, calculators, references, and documents inventoried.
2. **Feature Matrix** — Every major feature classified Lite / Pro / Offline / Premium.
3. **Platform evaluation** — Android, iOS, and PWA scored with recommendation.
4. **App Architecture** — Diagram and component table with reuse mapping.
5. **Lite vs Pro** — User-facing comparison table with disclaimers.
6. **Monetisation** — Strategy with prohibited compliance claims noted.
7. **Store readiness** — Play, App Store, and PWA checklist items listed.
8. **UI adaptations** — PWA grid, assurance panels, export, and document UX addressed.
9. **Roadmap** — Phased plan with file-level tasks and acceptance criteria.
10. **Assurance preserved** — Traceability, validation, confidence not stripped from Pro tier.

---

## 7. Deliverables checklist

- [ ] App Architecture (§4.1)
- [ ] Feature Matrix (§4.2)
- [ ] Lite vs Pro Comparison (§4.3)
- [ ] Revenue Opportunities (§4.4)
- [ ] Development Roadmap (§4.5)
- [ ] Platform recommendation with scores
- [ ] Store readiness checklist (privacy, disclaimers, IAP)
- [ ] UI adaptation notes for flagship PWA calculator
- [ ] Risk register (licensing, offline size, store rejection)

---

## Execution instructions for Cursor

When invoked with this prompt:

1. **Review first** — Walk `PROJECT-STRUCTURE.md`, aerospace section, `pwa-*` modules, Document Library, and hub pages before planning.
2. **Inventory everything** — Build Feature Matrix from actual repo paths, not assumptions.
3. **Reuse over rewrite** — Prefer WebView/Capacitor wrapping existing JS over porting formulae.
4. **Tier honestly** — Aerospace assurance features are Pro; do not paywall basic safety disclaimers.
5. **Evaluate all three platforms** — PWA, Android, iOS with scored comparison.
6. **Produce §4 output** — All five sections in order before implementation proposals.
7. **Link roadmap to repo** — Cite specific files and related prompts per phase.
8. **Disclaimer** — All store copy and monetisation plans must include engineering-not-certification language.
9. **Summarise** — End with platform recommendation, MVP scope (Lite + Pro v1), and estimated phase 1 effort.

---

*Engineering Knowledge Hub — Aerospace Engineering Toolkit — Mobile App Conversion prompt v1.0*
