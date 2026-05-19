---
name: TuyaOpen DP Add
description: Add a Tuya cloud Data Point definition to the project.
when_to_use: Use when the user asks to add, register, or define a new DP (Data Point) — typically when wiring a sensor reading or actuator command to the Tuya cloud schema.

id: tuyaopen-dp-add
surfaces: [cloud, embedded]
tags: [dp, cloud]
command: tuyaopen.skill.dpAdd
fallback_commands: []
default_enabled: true
related: [tuyaopen-dp-list, tuyaopen-project-config]
i18n_title: skill.dpAdd.title
i18n_description: skill.dpAdd.description
i18n_when: skill.dpAdd.when
---

# TuyaOpen DP Add

Add a Tuya cloud Data Point definition to the project.

## When to use

Use when the user asks to add, register, or define a new DP (Data Point) — typically when wiring a sensor reading or actuator command to the Tuya cloud schema.

## Prerequisites

- A TuyaOpen project is open and `tuyaopen.project.ini` is writable.
- The user has provided (or you can infer) a DP id, type (bool/int/string/enum/raw), name, and direction (rw/ro/wo).

## How the agent should invoke it

Prefer the **Run Command** tool with the registered VSCode command id:

```
Run Command "tuyaopen.skill.dpAdd"
```

If `Run Command` is unavailable, fall back to the SDK terminal:

```bash
# from the project root, with the TuyaOpen SDK env active
cd <project> && tos.py dp add --id <id> --type <type> --name <name> --mode <rw|ro|wo>
```

## Arguments

- `--id <dp-id>` numeric DP id (1..255).
- `--name <name>` human-readable label.
- `--type <bool|int|string|enum|raw>` DP type.
- `--mode <rw|ro|wo>` access mode.

## Success signal

The DP is appended to the project descriptor and the IDE re-renders the project config preview without errors.

## Related skills

- `tuyaopen-dp-list`
- `tuyaopen-project-config`

_Maintained in the TuyaOpen IDE skills registry. Reinstall the skill from the IDE's Skills page after registry updates._
