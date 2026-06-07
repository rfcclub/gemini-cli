---
id: athanor-auto-boot
title: Athanor Auto-Boot System Prompt Injection
---

# Athanor Auto-Boot System Prompt Injection

## REQUIREMENT: Athanor File Detection
The system MUST detect the presence of the Athanor directory and its core files.

**SCENARIO:** Default Athanor directory exists
* **GIVEN** the directory `~/.gemini-vesta/athanor/` exists
* **AND** it contains `BOOT.md` and `AXIOMS.md`
* **WHEN** the `AthanorWeaver` initializes
* **THEN** it MUST successfully read the contents of these files.

**SCENARIO:** Custom Athanor directory via env var
* **GIVEN** the environment variable `VESTA_ATHANOR_DIR` is set to `/custom/path/`
* **AND** `/custom/path/` contains `BOOT.md`
* **WHEN** the `AthanorWeaver` initializes
* **THEN** it MUST read the contents from `/custom/path/BOOT.md`.

**SCENARIO:** Athanor directory is missing
* **GIVEN** neither `~/.gemini-vesta/athanor/` nor `VESTA_ATHANOR_DIR` point to a valid directory
* **WHEN** the `AthanorWeaver` initializes
* **THEN** it MUST fail gracefully without throwing an application-crashing error
* **AND** it MUST return an empty string for the Athanor context.

## REQUIREMENT: System Prompt Injection
The system MUST append the Athanor content to the core system prompt.

**SCENARIO:** Injecting Athanor content
* **GIVEN** the `AthanorWeaver` has successfully loaded Athanor content
* **WHEN** `PromptProvider.getCoreSystemPrompt` is called
* **THEN** the returned prompt MUST end with the Athanor content wrapped in `<athanor_core>` tags.

**SCENARIO:** Caching Athanor content
* **GIVEN** the `AthanorWeaver` has successfully loaded Athanor content on the first call
* **WHEN** `PromptProvider.getCoreSystemPrompt` is called multiple times
* **THEN** disk I/O MUST only occur on the first call
* **AND** subsequent calls MUST use the cached content.
