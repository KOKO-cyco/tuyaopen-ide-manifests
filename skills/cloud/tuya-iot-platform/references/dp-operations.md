# DP (Data Points / 功能点) Operations

DPs are the functional definitions of a product — switch state, brightness level, color, etc.

## Query: current DPs on the product

```bash
# DPs currently selected on the product (standard + custom + cloud BIC functions)
tuya-devplat-cli product dp-schema --product-id <pid> --format json
```

Response shape:
- `dps[]` — active standard and custom DPs
- `uiConfig.bic[]` — cloud (BIC) functions enabled

## Query: full DP pool from the solution

```bash
# All standard DPs the solution defines — used to pick IDs before adding them
tuya-devplat-cli product dp-list --product-id <pid> --format json
```

Use `dp-list` to discover DP IDs, then use those IDs in the add/remove commands below.

---

## Add standard DPs (required after product creation)

A newly created product has no DPs. Always call this right after creation:

```bash
tuya-devplat-cli product dp-add-standard \
  --product-id <pid> \
  --self-dps "[1,2,3]" \
  --dry-run --format json

tuya-devplat-cli product dp-add-standard \
  --product-id <pid> \
  --self-dps "[1,2,3]" \
  --confirm <token> --format json
```

`--self-dps` is a JSON array of DP IDs from `dp-list`.
`--another-dps` is an optional second group (defaults to `[]`).

## Add a custom DP

```bash
tuya-devplat-cli product dp-add-custom \
  --product-id <pid> \
  --dp '{"code":"custom_switch","dpType":1,"name":"Custom Switch"}' \
  --dry-run --format json
```

## Update an existing DP

```bash
tuya-devplat-cli product dp-update \
  --product-id <pid> \
  --dp '{"id":1,"name":"Renamed DP"}' \
  --dry-run --format json
```

## Remove a standard DP

```bash
tuya-devplat-cli product dp-remove-standard \
  --product-id <pid> \
  --dp-id <dpId> \
  --dry-run --format json
```

## Validate all DPs

```bash
tuya-devplat-cli product dp-valid --product-id <pid> --format json
```

Run this before attempting to release the product to catch schema errors early.
