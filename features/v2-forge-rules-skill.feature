Feature: forge-rules skill and visualization guide
  The skill negotiates dependency rules with the user and ships the
  visualization guide; both are harness-agnostic.

  Scenario: Skill discovery
    When I run "npx skills add . --list" in arc-forge
    Then forge-rules appears among listed skills

  Scenario: Grilling protocol is option-based, one question per message
    Given the skill playbook for stage Grill
    Then it instructs: one question per message, 2-4 grounded options each with a
    one-line trade-off, a marked recommendation, and a free-text escape hatch
    And it names no specific harness tool

  Scenario: Finalization loops on the real gate
    Given agreed rules written to forge-gate.config.json
    When the agent runs "forge-gate check --deps"
    Then red output returns the session to negotiation until green
    Or violations are consciously accepted and recorded in decision notes

  Scenario: No hardcoded opinions
    Given the skill's playbooks and references
    Then none contain default layer names, default rules, or policy prescriptions

  Scenario: Visualization guide exists without shipping rendering code
    Given references/visualization.md in the skill
    Then it prescribes graph formats (Mermaid, DOT), node/edge conventions,
    violation highlighting, and leaves rendering choice to the host environment
