---
name: TuyaOpen Flash
description: Flash the built binary to a connected device.
when_to_use: Use after a successful build when the user asks to flash, burn, deploy to device, or program the connected board.

id: tuyaopen-flash
surfaces: [embedded]
tags: [flash, device]
command: tuyaopen.skill.flash
fallback_commands: []
default_enabled: true
related: [tuyaopen-build, tuyaopen-device-pair]
i18n_title: skill.flash.title
i18n_description: skill.flash.description
i18n_when: skill.flash.when
---

# TuyaOpen Flash

Flash the built binary to a connected device.

## When to use

Use after a successful build when the user asks to flash, burn, deploy to device, or program the connected board.

## Prerequisites

- The project has been built — invoke `tuyaopen-build` first if `build/` is missing or stale.
- A target device is connected over USB / serial. The IDE will surface a device picker if multiple ports are available.

## How the agent should invoke it

Prefer the **Run Command** tool with the registered VSCode command id:

```
Run Command "tuyaopen.skill.flash"
```

If `Run Command` is unavailable, fall back to the SDK terminal:

```bash
# from the project root, with the TuyaOpen SDK env active
cd <project> && tos.py flash
```

## Arguments

- Optional `--port <serial-port>` if the user has specified one. Otherwise the IDE prompts.

## Success signal

The flash tool reports verification success and the device is left in a runnable state.

## Related skills

- `tuyaopen-build`
- `tuyaopen-device-pair`

_Maintained in the TuyaOpen IDE skills registry. Reinstall the skill from the IDE's Skills page after registry updates._
