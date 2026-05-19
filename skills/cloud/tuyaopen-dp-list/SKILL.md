---
name: TuyaOpen DP List
description: List existing DPs and their schema for the active project.
when_to_use: Use when the user asks "what DPs do I have?", needs to verify a DP id before adding a new one, or wants to confirm the cloud schema before generating bindings.

id: tuyaopen-dp-list
surfaces: [cloud, embedded]
tags: [dp, cloud]
command: tuyaopen.skill.dpList
fallback_commands: []
default_enabled: true
related: [tuyaopen-dp-add, tuyaopen-project-config]
i18n_title: skill.dpList.title
i18n_description: skill.dpList.description
i18n_when: skill.dpList.when
---

# TuyaOpen DP List

List existing DPs and their schema for the active project.

## When to use

Use when the user asks "what DPs do I have?", needs to verify a DP id before adding a new one, or wants to confirm the cloud schema before generating bindings.

## Prerequisites

- A TuyaOpen project is open with at least one DP defined (otherwise the result will be empty).

## How the agent should invoke it

Prefer the **Run Command** tool with the registered VSCode command id:

```
Run Command "tuyaopen.skill.dpList"
```

If `Run Command` is unavailable, fall back to the SDK terminal:

```bash
# from the project root, with the TuyaOpen SDK env active
cd <project> && tos.py dp list
```

## Arguments

- No arguments.

## Success signal

A table of `(id, name, type, mode)` is printed to the output channel and surfaced to the agent.

## Related skills

- `tuyaopen-dp-add`
- `tuyaopen-project-config`

_Maintained in the TuyaOpen IDE skills registry. Reinstall the skill from the IDE's Skills page after registry updates._
