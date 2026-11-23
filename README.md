# Editable website sources

The complete site and model/data snapshot are embedded in ../index.html. Open that HTML directly to run it; no install is needed.

app.mjs contains the interface and presentation behavior. layout.css contains only the P4.31 layout overrides; four original P3.08 style sheets remain embedded unchanged. Neither editable file contains a newly fitted pricing model.

To update the UI: edit app.mjs or layout.css, then run `python3 source/rebuild_ui.py` from the publication folder (Python and lxml required only for rebuilding). It retains the embedded model, fit parameters and data, replaces the UI code/CSS, and updates the publication hash.

Run `node --test source/test_ui.mjs` from the publication folder to execute the DOM-adapter checks against the standalone HTML. review/dom_blueprint.json is the inspected DOM fixture from this build; regenerate it if element IDs or attributes are changed. The tests are software checks, not browser layout, phone or human usability tests.

The original full research source archive remains a separate historical artifact. Current-contract source locators refer to that archive; contract and input review queues are under ../review.

The P4.31 interface has optional current-season base salary references embedded separately from the learned model. These references never enter prediction calculations. The trained historical model remains unchanged in index.html.
