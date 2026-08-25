Feature: Dependency-rule enforcement gate
  forge-gate check --deps evaluates negotiated dependencyRules from
  forge-gate.config.json against static imports with the standard exit contract.

  Scenario: Forbidden import fails naming both endpoints
    Given a rule "scripts/**" forbidding "packages/*/src/**"
    And scripts/release.mjs importing from packages/forge-gate/src/check.mjs
    When I run "forge-gate check --deps"
    Then the exit code is 1
    And stderr prints "scripts/release.mjs -> packages/forge-gate/src/check.mjs (violates rule N)"

  Scenario: First matching rule wins and forbid beats allow
    Given rules ordered so two "from" patterns match one file
    And the matched rule lists a target in both allow and forbid
    Then the target is treated as forbidden

  Scenario: Sibling imports never violate
    Given scripts/a.mjs importing ./b.mjs
    Then no violation is reported (implicit self-allow)

  Scenario: Workspace packages are not external
    Given a bare specifier "forge-gate" resolving via node_modules symlink into this repo
    When the importer is not allowed to reach it
    Then a violation IS reported

  Scenario: Unresolvable relative import fails loudly
    Given src/a.js importing "./does-not-exist"
    When I run "forge-gate check --deps"
    Then the exit code reports a gate failure naming file and specifier

  Scenario: require() participates so .cjs files are covered
    Given a .cjs file requiring a forbidden path
    Then a violation is reported

  Scenario: Misconfiguration is a setup error
    When dependencyRules has rules not an array, or [] with unmatched deny, or invalid globs
    Then the exit code is 2 with actionable stderr

  Scenario: Negative fixture proves the gate bites
    Given arc-forge's own root config
    And a committed deliberately-violating fixture evaluated in tests
    Then the gate demonstrably fails on it

  Scenario: Gate order — deps runs first
    When I run "forge-gate check" with all gates enabled
    Then deps violations are reported before any crap/mutation work runs
