# Gauntlet QA Procedure

Run from the repository root after all unit gates pass:

1. `npm install` — workspace dependencies resolve.
2. `npx skills add . --list` — the gauntlet skill appears in the list.
3. In a scratch JS project with deliberately bad code, run
   `node <repo>/packages/gauntlet/bin/gauntlet.mjs check --crap`
   and confirm exit code 1 with actionable output.
4. Repeat step 3 with `--mutation` against a fake low-score report; confirm exit code 1.
5. Confirm `gauntlet.config.json` overrides raise the threshold so bad code passes.
6. Confirm every stage playbook in `skills/engineering/gauntlet/references/`
   names its gate command exactly as implemented in this package.
