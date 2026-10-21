# Year 1 question corrections — 21 October 2026

This release addresses the 12 priority findings from the October audit and the two additional questions with weak LO links. It retains five banks of 70 questions and preserves question IDs. Each of the 14 edited questions has an incremented revision; release manifests and their filter metadata have been refreshed.

| Question | Correction |
| --- | --- |
| mb1-015 | Replaced the ambiguous Chlamydia alternative with Klebsiella and corrected the cell-wall clue comparison. |
| mb1-026 | Specified a surgical resection specimen for full-thickness inflammation, rather than implying routine endoscopic biopsy can establish it. |
| mb1-058 | Replaced the answer-restatement task with interpretation of calcium, phosphate, calcitriol and PTH in CKD. |
| mb2-003 | Replaced crystal recognition with the renal mechanism of indapamide, directly assessing the antihypertensive-mechanism LO. |
| mb2-006 | Linked refractory-period physiology to the cardiac-muscle LO in Ischaemic Heart Disease; improved the distractors and electrical/mechanical reasoning. |
| mb2-032 | Rewrote the scored task around appetite and food intake during GLP-1 treatment for obesity. |
| mb3-033 | Supplied explicit hypothetical nutrition/emissions data and decision criteria, so one option satisfies every stated goal. |
| mb3-057 | Replaced repeated renal acid-excretion recall with calculation of expected respiratory compensation using a supplied rule and unit conversion. |
| mb3-058 | Replaced repeated haemodialysis urea diffusion with glucose-driven peritoneal water removal. |
| mb4-025 | Replaced stool-colour physiology with interpretation of a hepatocellular liver-test pattern. |
| mb4-027 | Replaced portal-pressure physiology with stellate-cell activation and matrix production, directly assessing inflammation-to-fibrosis progression. |
| mb4-047 | Replaced placental exchange physiology with neurulation in the developmental sequence. |
| mb5-018 | Linked filtered load to the GFR LO; made options comparable rates and corrected the arithmetic explanation for every alternative. |
| mb5-064 | Replaced the downstream oedema question with identification and function of podocyte specialisations. |

The explanatory text, distractor feedback, assessment objective and Deep Review were updated together. References used for targeted checks are recorded in each question. The biochemical and nutritional values are teaching scenarios, not patient records or measured menu data.

These revisions have AI editorial provenance. They do not claim independent clinician review; `reviewedAt` remains blank. The remaining lower-priority polish recommendations from the audit have not all been implemented in this release.

## LO coverage implication

An LO tag represents the aspect assessed by the scored task, not complete coverage of a broad LO. Moving mb2-006 to its appropriate cardiac-muscle objective removes its former conducting-system/arrhythmia tag. That former LO therefore needs its own aligned question; relabelling an unrelated item would conceal the gap.

After these corrections, 180 of the 292 curriculum LOs have at least one tag and 112 have none. The eight weak links identified in the audit have all been addressed by rewriting the scored task or selecting the appropriate LO.

## JSON prompter

Both public and studio generators use the updated shared prompt. It now requires `lo` and a specific `assessmentObjective`, checks alignment against the scored task, and plans variety across objectives before drafting. It explicitly checks alternative defensible answers, realistic investigations/specimens, numerical feedback, units and difficulty estimates.

Both forms include optional existing-question material. The prompt compares tasks and mechanisms, rather than merely comparing wording. Without comparison material, it only claims to check the new batch for repetition. These instructions improve generation guidance; schema validation alone cannot establish clinical accuracy or semantic LO relevance.

## Validation

- Build public and studio bundles; run the complete Node test suite.
- Check all 350 question IDs and bank membership; verify that only the intended 14 records changed and their revisions increased.
- Check edited LO wording against the Year 1 curriculum inventory.
- Check literal stem clues, option indexes, distractor slots and release filter metadata.
- Exercise the prompt form in a browser, including optional existing questions, generated output and mobile layout.
- After publication, verify the deployed library and prompt assets against the built files.
