Feature: gauntlet check CLI
  Deterministic quality gates for AI coding agents.
  Exit codes: 0 pass, 1 gate failure, 2 setup error.

  Scenario: All gates pass on a healthy project
    Given a project with passing tests, full coverage, and a mutation report at threshold
    When I run "gauntlet check"
    Then the exit code is 0

  Scenario: CRAP gate fails on a complex uncovered function
    Given a project with a function of cyclomatic complexity 4 at 0% coverage
    When I run "gauntlet check --crap"
    Then the exit code is 1
    And stderr lists the function name, line number, and CRAP score
    And stderr suggests raising the threshold or refactoring

  Scenario: Mutation gate fails below threshold score
    Given a Stryker report with mutation score 60
    And a configured mutation score threshold of 85
    When I run "gauntlet check --mutation"
    Then the exit code is 1
    And stderr shows the score and the required threshold

  Scenario: Spec gate fails when tests fail
    Given a project whose configured testCommand exits nonzero
    When I run "gauntlet check --spec"
    Then the exit code is 1

  Scenario: Missing coverage summary is a setup error
    Given a project with no coverage/coverage-summary.json
    When I run "gauntlet check --crap"
    Then the exit code is 2
    And stderr explains how to generate coverage with c8

  Scenario: Thresholds overridden by config file
    Given a gauntlet.config.json setting crapThreshold to 30
    And a function of cyclomatic complexity 4 at 0% coverage
    When I run "gauntlet check --crap"
    Then the exit code is 0
