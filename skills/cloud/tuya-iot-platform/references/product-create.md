# Product Creation Workflow

## 1. Find the right category

```bash
# Flat list of AI-enabled standard categories with breadcrumb paths
tuya-devplat-cli product category-tree --type standard --format json

# Narrow by keyword
tuya-devplat-cli product category-tree --type standard --keyword "灯" --format json
```

Each leaf entry returns:
- `categoryCode` — **front-end category code** for `create-common` (e.g. `wf_ble_dj`)
- `id` — category node ID
- `path` — breadcrumb like `电工 > 照明 > 灯具`

## 2. Get solutions for the category

**Common mode** (recommended):
```bash
tuya-devplat-cli product solution-list --category-code <frontEndCategoryCode> --format json
```

**Custom mode** (needs explicit hardware solution + communication type):
```bash
tuya-devplat-cli product custom-list --category-code <subCategoryCode> --format json
tuya-devplat-cli product communication-list --docking-group-id <id> --format json
```

## 3. Create the product

**Common mode** — front-end category code + solution ID:
```bash
tuya-devplat-cli product create-common \
  --name "My Smart Light" \
  --category wf_ble_dj \
  --solution-id 12345 \
  --project-id $PROJECT_ID \
  --dry-run --format json

tuya-devplat-cli product create-common \
  --name "My Smart Light" \
  --category wf_ble_dj \
  --solution-id 12345 \
  --project-id $PROJECT_ID \
  --confirm <token> --format json
```

**Custom mode** — sub-category code + hardware solution + communication type:
```bash
tuya-devplat-cli product create-custom \
  --name "My Device" \
  --category-code dj \
  --solution-id 456 \
  --communication-type 1025 \
  --project-id $PROJECT_ID \
  --dry-run --format json
```

**TuyaLink mode** — TuyaLink protocol products:
```bash
tuya-devplat-cli product create-tuyalink \
  --name "My TuyaLink Device" \
  --device-type <type> \
  --data-format <format> \
  --communication-tag <tag> \
  --project-id $PROJECT_ID \
  --dry-run --format json
```

## 4. Extract the PID

The successful create response contains `data.id` — this is the **Product ID (PID)**.

```bash
tuya-devplat-cli product detail --id <pid> --format json
```

> The CLI auto-saves the PID to sandbox resource relations when `--project-id` or `$PROJECT_ID`
> is set. If neither is present, the relation step is skipped but the product is still created.

## Next steps after creation

1. Add DPs — a new product has none by default. See `dp-operations.md`.
2. Attach a panel or release the product. See `panel-release.md`.
