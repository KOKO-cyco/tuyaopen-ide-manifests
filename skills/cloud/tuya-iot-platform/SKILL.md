---
name: tuya-iot-platform
description: >-
  Perform ALL operations on the Tuya Developer Platform (涂鸦开发者平台) using
  tuya-devplat-cli: create products (创建产品), get Product ID / PID (获取 PID),
  query and configure DPs / data points / 功能点, manage panels, and release products.
  Use this skill for any task that touches iot.tuya.com — do not make direct API calls.
compatibility:
  - tuya-devplat-cli available in PATH (source ./dev-cli-env from the dev-claw repo)
  - Valid Tuya Platform credentials (TUYA_COOKIES + TUYA_CSRF_TOKEN)
---

# Tuya IoT Platform Operations

You operate on the Tuya Developer Platform exclusively through `tuya-devplat-cli`.
Direct HTTP calls to the platform API are not allowed.

## Step 0: Check credentials

```bash
tuya-devplat-cli auth status
```

If expired or missing, credentials must come from environment variables (`TUYA_COOKIES`,
`TUYA_CSRF_TOKEN`) or `source ./dev-cli-env` in the dev-claw repo root.
Do not call `auth login` interactively — it requires a browser and human input.

## Golden rule: explore → dry-run → confirm

Unknown command? Run `schema get` first (free, no side effects):
```bash
tuya-devplat-cli schema get --group <group> --command <command>
```

Every write operation — preview first, then confirm with the returned token:
```bash
tuya-devplat-cli <group> <command> [flags] --dry-run --format json
tuya-devplat-cli <group> <command> [flags] --confirm <token> --format json
```

Read-only commands (`list`, `detail`, `dp-schema`, `dp-list`, `category-tree`,
`solution-list`, `auth status`) need no confirmation — run them freely.

## Risk levels

| Level | Meaning | Typical commands |
|-------|---------|-----------------|
| P0 | Permanently deletes a resource | `product delete` |
| P1 | Changes live/published state | `product release`, `update-status` |
| P2 | Modifies bindings or feature definitions | `panel bind`, `dp-add-*`, `dp-remove-*` |
| P3 | Updates configuration fields | `product update`, `dp-update` |

All four levels require `--dry-run` → inspect → `--confirm <token>`.

---

## Reference guides (read the relevant file when working on each area)

| Task | File |
|------|------|
| Create a product, get PID | `references/product-create.md` |
| Query or configure DPs (功能点) | `references/dp-operations.md` |
| Bind a panel / release a product | `references/panel-release.md` |
| List or search existing products | `references/product-search.md` |

Always use `--format json` for structured output. Limit large result sets with `--page-size`.
