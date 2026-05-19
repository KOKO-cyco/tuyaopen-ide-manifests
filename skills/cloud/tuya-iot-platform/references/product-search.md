# Listing and Searching Products

## List all products

```bash
tuya-devplat-cli product list --format json
tuya-devplat-cli product list --page-size 20 --page-no 1 --format json
```

## Search by name, PID, or model

```bash
# By product name
tuya-devplat-cli product list --type name --keyword "Smart Light" --format json

# By Product ID (PID)
tuya-devplat-cli product list --type id --keyword "p_abc123" --format json

# By model number
tuya-devplat-cli product list --type model --keyword "tuyaModel" --format json
```

## Get full product details

```bash
tuya-devplat-cli product detail --id <pid> --format json
```

Returns the complete product record: name, category, status, communication type,
solution info, panel binding state, and more.
