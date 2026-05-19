# Panel Binding and Product Release

## Attaching a panel

The two approaches are **mutually exclusive** for a given product — choose one, do not mix.

### Approach A: Select an existing panel

```bash
# 1. Browse available panels for this product
tuya-devplat-cli panel product-list --format json
tuya-devplat-cli panel ui-list --product-id <pid> --format json

# 2. Bind the chosen panel
tuya-devplat-cli panel bind \
  --panel-id <panelId> \
  --product-id <pid> \
  --dry-run --format json

tuya-devplat-cli panel bind \
  --panel-id <panelId> \
  --product-id <pid> \
  --confirm <token> --format json

# 3. Publish the panel binding
tuya-devplat-cli product release-ui \
  --product-id <pid> \
  --dry-run --format json

tuya-devplat-cli product release-ui \
  --product-id <pid> \
  --confirm <token> --format json
```

### Approach B: AI-generate a panel

```bash
tuya-devplat-cli panel ai-create --product-id <pid> --format json
```

---

## Product release

### Pre-release validation

```bash
# Check release readiness — run this before attempting to release
tuya-devplat-cli product release-validate --product-id <pid> --format json

# Get current release information
tuya-devplat-cli product release-info --product-id <pid> --format json
```

### Advance development status (P1 — production impact)

```bash
tuya-devplat-cli product update-status \
  --product-id <pid> \
  --status <targetStatus> \
  --old-status <currentStatus> \
  --dry-run --format json

tuya-devplat-cli product update-status \
  --product-id <pid> \
  --status <targetStatus> \
  --old-status <currentStatus> \
  --confirm <token> --format json
```

Check `tuya-devplat-cli schema get --group product --command update-status` for valid
status codes before calling this.
