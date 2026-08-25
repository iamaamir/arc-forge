Feature: TypeScript support in forge-gate CRAP gate
  forge-gate parses .ts/.mts/.cts via amaro transform + acorn,
  preserving line numbers so CRAP reports cite true positions.

  Scenario: Complex uncovered TS function fails CRAP citing position
    Given a .ts file exporting "function tangled(a: number): number" of cyclomatic complexity 4
    And coverage-final.json showing 0% statement coverage for that function's span
    When I run "forge-gate check --crap" in that project
    Then the exit code is 1
    And stderr names the file, the original line number, and the CRAP score

  Scenario: Line positions survive non-erasable syntax expansion
    Given a .ts file declaring an enum followed by a namespace followed by a function declaration
    When forge-gate analyzes that file
    Then each function's reported line equals its line in the original source
    And if any position shifts, the file is rejected with a SetupError naming the construct

  Scenario: Parameter properties fail cleanly
    Given a .ts class using "constructor(private service: Logger)"
    When I run "forge-gate check --crap"
    Then the exit code is 2
    And stderr names the unsupported syntax and the file

  Scenario: Coverage join works end to end for TS
    Given tests run under node --experimental-strip-types with c8 producing coverage-final.json
    And one TS function fully covered and one uncovered complex function
    When I run "forge-gate check --crap"
    Then only the uncovered function is flagged
    And when coverage data predates the source, a staleness warning appears on stderr without changing the exit code
