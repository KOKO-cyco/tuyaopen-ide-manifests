---
name: TuyaOpen Clean
description: Wipe build/ artifacts for a fresh rebuild.
when_to_use: Use when the user complains about stale builds, asks for a clean build, switches platform target, or pulls in a sub-SDK update that requires a full rebuild.

id: tuyaopen-clean
surfaces: [embedded]
tags: [build, maintenance]
command: tuyaopen.skill.clean
fallback_commands: []
default_enabled: true
related: [tuyaopen-build]
i18n_title: skill.clean.title
i18n_description: skill.clean.description
i18n_when: skill.clean.when
---

# TuyaOpen Clean

Wipe build/ artifacts for a fresh rebuild.

## When to use

Use when the user complains about stale builds, asks for a clean build, switches platform target, or pulls in a sub-SDK update that requires a full rebuild.

## Prerequisites

- A TuyaOpen project is open in the workspace.
- No build is currently in flight. The IDE serializes clean against active build tasks.

## How the agent should invoke it

Prefer the **Run Command** tool with the registered VSCode command id:

```
Run Command "tuyaopen.skill.clean"
```

If `Run Command` is unavailable, fall back to the SDK terminal:

```bash
# from the project root, with the TuyaOpen SDK env active
cd <project> && tos.py clean
```

## Arguments

- No arguments.

## Success signal

The `build/` directory is empty and `tuyaopen-build` will perform a full rebuild on the next invocation.

## Related skills

- `tuyaopen-build`

_Maintained in the TuyaOpen IDE skills registry. Reinstall the skill from the IDE's Skills page after registry updates._
