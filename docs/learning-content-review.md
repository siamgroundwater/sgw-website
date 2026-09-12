# Learning content review

Review date: 2026-09-11

## Scope and result

- Simplified learning-page explanations using Thai as the content base, with matching EN/ZH/JA copy.
- Added numbered teaching explanations to selected existing illustrations. They are schematic teaching material, not site measurements or construction drawings.
- Explained technical terms near their use and retained safety, sampling, permit and site-specific caveats.
- Made troubleshooting examples explicitly illustrative; a few entered measurements do not establish a diagnosis.
- Distinguished Thailand's over-15-metre legal threshold from the scientific definition of groundwater.
- No public “reviewed” dates were advanced. This is a bounded content/source review, not legal recertification or engineering approval.

## Primary sources checked

| Source | What was checked | Access during review |
| --- | --- | --- |
| [USGS: Groundwater Basics](https://www.usgs.gov/mission-areas/water-resources/science/groundwater-basics) | Saturated pores/cracks, aquifers and natural variation | Page retrieved |
| [DGR: Groundwater origins](https://www.dgr.go.th/th/newsAll/124/2637) | Infiltration from precipitation and surface water | Page retrieved |
| [USGS: Specific-capacity test limitations](https://www.usgs.gov/publications/factors-affecting-specific-capacity-tests-and-their-application-a-study-six-low) | Dependence on pumping rate, duration and initial water level | Page retrieved |
| [USGS: Hydraulic characterization report](https://pubs.usgs.gov/publication/ofr20241007/full) | Specific capacity = pumping rate divided by drawdown | Indexed source text retrieved |
| [NSF: Reverse osmosis systems](https://www.nsf.org/knowledge-library/nsf-ansi-58-reverse-osmosis-drinking-water-treatment-systems) | RO/TDS terminology; TDS reduction differs from specific-contaminant claims | Page retrieved |
| [FDA: Reverse Osmosis](https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/inspection-technical-guides/reverse-osmosis) | Basic RO and TDS definitions only | Page retrieved; historical guidance, not used as a current design standard |
| [DGR: Permit FAQ](https://www.dgr.go.th/th/faq/18) | Public permit guidance and source limitations | Page retrieved; includes old regulatory references |
| [DGR: Drilling and use permission](https://www.dgr.go.th/th/vdo/146/443) | Public over-15-metre threshold and drilling/use permission guidance | Indexed text retrieved; full page unavailable |

Specific-capacity comparisons need comparable pumping rates, durations and conditions. The value alone does not prove sustainable yield. A TDS reading alone does not establish drinking-water safety.

## Unavailable references and limits

The following pages could not be fully retrieved during this review:

- [DGR permit process/forms](https://www.dgr.go.th/gcl/th/newsAll/433/13900)
- [DGR consolidated Groundwater Act page](https://www.dgr.go.th/gcl/th/newsAll/435/14193)
- [DGR water-quality reference](https://www.dgr.go.th/th/newsAll/124/7941)
- [DGR reference 11299](https://www.dgr.go.th/th/newsAll/124/11299)
- [DGR drilling/use guidance](https://www.dgr.go.th/th/vdo/146/443)
- [DGR permission explainer](https://www.dgr.go.th/th/newsAll/124/12774)

Retrieval errors and restricted local network access do not prove these links are broken. Their destinations and underlying legal instruments still need rechecking. No deadlines, legal-library statuses or public review dates were newly certified. Before acting, confirm current requirements with the competent groundwater officer and the applicable official instruments.

## Verification status

- Passed: 71 automated tests, repository-wide ESLint, TypeScript and hover-capability checks.
- Passed: optimized production build (409 generated pages). No deployment was made.
- Passed: all 28 learning routes (hub plus six articles in TH/EN/ZH/JA) had one page heading and no horizontal overflow at the 320-pixel browser viewport; the same routes rendered correctly in the local production server at desktop size.
- Visually checked diagram markers and explanations on mobile and desktop, including longer Japanese exercise labels. Repeated resizing across 320–1280 pixels produced no horizontal overflow on the FAQ page.
- Browser interactions passed: changed pumping depth from 27 to 32 m produced 20 m drawdown and 1.5 m³/h/m, then restored the example. Production FAQ search for TDS returned the drinking-water safety question; expanding it displayed the answer. No browser warnings/errors were logged in that production check.
- The computer-use skill guided browser-based visual and interaction checks; browser viewport emulation is not a substitute for a real phone or first-time reader.
- Native-speaking final approval of EN/ZH/JA: pending. Automated coverage is not native-language approval.
- First-time visitor testing on a real phone: pending; the worksheet below has not been run.

## Real-phone visitor test worksheet

Use someone unfamiliar with the site. Give each task without pointing to a page or button. Record what they do before offering help; do not ask them to perform physical well work.

Participant / date / phone / language: ______________________________

| Task | Success / help needed | Hesitation or misunderstanding |
| --- | --- | --- |
| You are planning a new well. Find what to prepare before contacting a contractor. | __________________ | __________________ |
| Water flow from an existing well has dropped. Find what information to collect and when expert help is needed. | __________________ | __________________ |
| Estimate daily water demand. Find a suitable tool and explain the inputs and what its result does not guarantee. | __________________ | __________________ |

Priority changes after observation: ______________________________

Native-language approvals: EN __________  ZH __________  JA __________
