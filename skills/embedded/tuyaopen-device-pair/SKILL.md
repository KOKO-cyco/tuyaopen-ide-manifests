---
name: TuyaOpen Device Pair
description: Pair or inspect a real device over serial.
when_to_use: Use when the user asks to pair, provision, or query state from a physical device over the serial console — useful while debugging cloud handshakes or firmware boot logs.

id: tuyaopen-device-pair
surfaces: [embedded]
tags: [device, serial]
command: tuyaopen.skill.devicePair
fallback_commands: []
default_enabled: false
related: [tuyaopen-flash]
i18n_title: skill.devicePair.title
i18n_description: skill.devicePair.description
i18n_when: skill.devicePair.when
---

# TuyaOpen Device Pair

Pair or inspect a real device over serial.

## When to use

Use when the user asks to pair, provision, or query state from a physical device over the serial console — useful while debugging cloud handshakes or firmware boot logs.

## Prerequisites

- A target device is connected over USB / serial.
- The IDE has been granted permission to open the serial port (on Linux, the user must be in the `dialout` group).

## How the agent should invoke it

Prefer the **Run Command** tool with the registered VSCode command id:

```
Run Command "tuyaopen.skill.devicePair"
```

If `Run Command` is unavailable, fall back to the SDK terminal:

```bash
# from the project root, with the TuyaOpen SDK env active
cd <project> && tos.py pair --port <port>
```

## Arguments

- `--port <serial-port>` device port.
- `--baud <rate>` optional baud rate; defaults to 115200.

## Success signal

A serial console attaches in the SDK terminal tab; pair/probe commands stream output back to the agent.

## Related skills

- `tuyaopen-flash`

_Maintained in the TuyaOpen IDE skills registry. Reinstall the skill from the IDE's Skills page after registry updates._
