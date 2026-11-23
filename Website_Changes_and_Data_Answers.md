# NBA Contract Lab — projected-value scope

**Interface:** P4.31, November 22, 2026  
**Pricing model:** Retained P4.25; no new fitting or accuracy claim.

## One purpose and one scenario

The website now explores hypothetical **2027–28 market value and contract schedules**. The 2026–27 Current Market Value view and the Value View selector are removed. The six summary cards are:

1. **Projected First-Year Market Value**
2. **Total Contract Value**
3. **Average Annual Value (AAV)**
4. **% of Cap**
5. **Current 2026–27 Salary** — optional recorded base salary, not a model output.
6. **2027–28 Salary Cap**

The first value is the retained model’s cap-share estimate multiplied by the entered cap. The default $176M 2027–28 cap is an assumption. The chosen years and raises produce the hypothetical total, AAV and annual schedule. Later cap growth changes later schedule cap percentages rather than setting salary raises.

This can support a hypothetical deal for a player already under contract or approaching an extension when the player’s performance inputs and model coverage support an estimate. It does not establish that the player can sign that deal, predict free agency or extension eligibility, or announce the player’s actual next contract. Performance remains through 2025–26, and pricing age/information remain fixed at the supplied November 8, 2026 snapshot. Renaming the card does not add a future development or aging model.

## Optional current-season salary reference

The new **Current 2026–27 Salary** card sits immediately to the right of % of Cap, before the 2027–28 Salary Cap. It shows recorded scheduled base salary for that one season, excluding incentives. It is not a current market-value estimate, a cap hit or the current contract’s multi-year AAV. The amount links to the supplied salary source.

The existing reviewed schedule records provide this reference for **280 of 437 players**. It is a dash where unverified. A missing reference never prevents a supported hypothetical schedule, changes its first-year value or fills a model input. The current-season reference remains fixed when the hypothetical 2027–28 cap or deal terms change.

The source is the previously reviewed source-backed current-period schedule intake, filtered to supplied roster identities, signatures through November 8, 2026, a 2026–27 schedule and the prior review exclusions. No new external source retrieval or complete current-roster contract audit was performed in this revision. `review/Current_Season_Salary_References.csv` locates the 280 displayed annual values and source links.

The model still learns from historical signed contracts and uses reviewed 2025–26 prior salary where available. An unknown prior salary is explicitly filled using the fit’s training median and flagged in the detailed inputs. A known 2026–27 reference is distinct from that historical input; this display revision does not alter the trained model or replace missing prior inputs with a later-year salary.

The broader current-contract total/AAV comparison view stays removed. There is no requirement to complete the earlier 157-player current-agreement research queue for the hypothetical builder to work. Those records can support future research without blocking this version.

## Existing model limitations remain

The retained data support **343 experimental model quotes** among 437 supplied roster profiles. **Shai Gilgeous-Alexander and Nikola Jokić** remain outside the reviewed training-performance envelope. Their model quotes are withheld. SGA’s signed-extension reference remains separate from a model prediction or accuracy score.

The remaining **92 profiles** need performance inputs: 55 lack completed NBA history in the supplied dataset, 29 have missing/reconciliation issues in numerical tables, and eight lack the required usable 2025–26 season. Those eight are Kyrie Irving, Georges Niang, Fred VanVleet, Tyrese Haliburton, Trey Lyles, Damian Lillard, Ben Simmons and Jordan McLaughlin. Available older statistics remain viewable. A different label does not create those missing observations or validate an older-history fallback.

## Estimate notes and restored statistics layout

**About This Estimate** is now a collapsed, full-width section inside **Model Method & Evidence** on the second tab. It is removed from the main valuation tab. Its body no longer has the 100-character-width restriction. Repeated global wording was consolidated while preserving player-specific source warnings, assumptions, data dates, scenario scope, cap/raise explanations and roster qualifications.

The statistics layout is restored to P4.28: Regular Season Context, Advanced Impact Analytics and Playoff Context are compact panels across the desktop. Each observed group’s twelve cards use a three-column/four-row grid. At narrower widths the panels stack, and small screens use two stat columns. It no longer uses P4.29’s twelve-card horizontal bands.

Original P3.08 base style sheets, fonts and colors are retained. Six summary cards fit across the desktop. The first-value card receives more width and the % of Cap card less; tablet rows use three cards and the first card spans the small-screen width. The historical-comparables box remains removed. Existing team/player selectors and the option/cap-growth tuner row remain intact.

## Verification and publication

Fourteen DOM-adapter interface checks pass. They exercise all 437 selections, match all 343 supported first-year values to the saved 2027–28 prices, test contract controls and cap changes, preserve missing-input/coverage holds, confirm twelve cards per observed statistical group, verify all 280 salary references, and check filters, tab handlers, validation and exports. Dedicated checks distinguish base salary from cap hit/AAV and prove that dropping the reference lookup does not affect a supported projection.

The learned data and prediction-code prefix are unchanged from P4.29. No accuracy improvement is claimed from this interface revision. A previous browser launch was blocked by an environment socket restriction, so actual desktop/phone rendering remains unverified here. No public deployment, live Notion edit or participant test was performed.

Open `index.html` in Chrome or Edge, inspect the restored statistics panels and a few supported/unsupported players, then upload the publication ZIP’s extracted contents to the GitHub Pages publishing folder. The original P3.08 archive remains at `checkpoints/part-iii-p308/index.html`.

## Final heading and summary polish

The expandable headings read About This Estimate and How The Model Works. The percentage summary is labeled % of Cap. Its narrower card gives the Projected First-Year Market Value heading more room; the heading stays on one line. This changes presentation only.
