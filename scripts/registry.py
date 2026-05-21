#!/usr/bin/env python3
"""
registry.py — manage registry.json in this repo

Run from the repo root (tuyaopen-ide-manifests) or from any directory:
  python scripts/registry.py list
  python scripts/registry.py bump <domain> [patch|minor|major]
  python scripts/registry.py touch
  python scripts/registry.py add <domain> <url> <version> <summary>
  python scripts/registry.py remove <domain>
  python scripts/registry.py get <domain>
  python scripts/registry.py set <domain> <field> <value>

Examples:
  python scripts/registry.py list
  python scripts/registry.py bump skills
  python scripts/registry.py bump boardsAndChips minor
  python scripts/registry.py touch
  python scripts/registry.py add platforms platforms/index.json 0.1.0 "芯片平台"
  python scripts/registry.py remove platforms
  python scripts/registry.py get skills
  python scripts/registry.py set skills summary "Cursor Skills (updated)"
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), '..', 'registry.json')


def load():
    with open(REGISTRY_PATH, encoding='utf-8') as f:
        return json.load(f)


def save(data):
    tmp = REGISTRY_PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    os.replace(tmp, REGISTRY_PATH)


def bump_version(version, part):
    parts = version.split('.')
    if len(parts) != 3:
        print(f'Invalid semver: {version}', file=sys.stderr)
        sys.exit(1)
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    if part == 'major':
        major, minor, patch = major + 1, 0, 0
    elif part == 'minor':
        minor, patch = minor + 1, 0
    else:
        patch += 1
    return f'{major}.{minor}.{patch}'


def cmd_list(data, _args):
    manifests = data.get('manifests', {})
    print(f'registry: {data.get("name")}  publishedAt={data.get("publishedAt")}')
    print(f'{len(manifests)} manifests in {os.path.normpath(REGISTRY_PATH)}:')
    for domain, entry in manifests.items():
        print(f'  {domain:<20} v{entry.get("version", "?"):<10} {entry.get("summary", "")}')


def cmd_bump(data, args):
    domain = args.domain
    part = args.part or 'patch'
    manifests = data.get('manifests', {})
    if domain not in manifests:
        print(f'Not found: {domain}', file=sys.stderr)
        sys.exit(1)
    before = manifests[domain]['version']
    after = bump_version(before, part)
    manifests[domain]['version'] = after
    save(data)
    print(f'{domain}.version: {before} → {after}')


def cmd_touch(data, _args):
    before = data.get('publishedAt')
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    data['publishedAt'] = now
    save(data)
    print(f'publishedAt: {before} → {now}')


def cmd_add(data, args):
    manifests = data.setdefault('manifests', {})
    if args.domain in manifests:
        print(f'Already exists: {args.domain}', file=sys.stderr)
        sys.exit(1)
    manifests[args.domain] = {
        'url': args.url,
        'version': args.version,
        'summary': args.summary,
    }
    save(data)
    print(f'Added: {args.domain}')


def cmd_remove(data, args):
    manifests = data.get('manifests', {})
    if args.domain not in manifests:
        print(f'Not found: {args.domain}', file=sys.stderr)
        sys.exit(1)
    del manifests[args.domain]
    save(data)
    print(f'Removed: {args.domain}')


def cmd_get(data, args):
    manifests = data.get('manifests', {})
    if args.domain not in manifests:
        print(f'Not found: {args.domain}', file=sys.stderr)
        sys.exit(1)
    print(json.dumps(manifests[args.domain], indent=2, ensure_ascii=False))


def cmd_set(data, args):
    manifests = data.get('manifests', {})
    if args.domain not in manifests:
        print(f'Not found: {args.domain}', file=sys.stderr)
        sys.exit(1)
    try:
        value = json.loads(args.value)
    except json.JSONDecodeError:
        value = args.value
    before = manifests[args.domain].get(args.field)
    manifests[args.domain][args.field] = value
    save(data)
    print(f'{args.domain}.{args.field}: {json.dumps(before)} → {json.dumps(value)}')


def main():
    parser = argparse.ArgumentParser(
        prog='registry.py',
        description='Manage registry.json',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest='cmd')

    sub.add_parser('list', help='list all manifest domains')

    p_bump = sub.add_parser('bump', help='bump semver version of a domain')
    p_bump.add_argument('domain')
    p_bump.add_argument('part', nargs='?', choices=['patch', 'minor', 'major'], default='patch')

    sub.add_parser('touch', help='set publishedAt to current UTC time')

    p_add = sub.add_parser('add', help='add a new manifest domain')
    p_add.add_argument('domain')
    p_add.add_argument('url')
    p_add.add_argument('version')
    p_add.add_argument('summary')

    p_remove = sub.add_parser('remove', help='remove a manifest domain')
    p_remove.add_argument('domain')

    p_get = sub.add_parser('get', help='print a manifest entry as JSON')
    p_get.add_argument('domain')

    p_set = sub.add_parser('set', help='set a field in a manifest entry')
    p_set.add_argument('domain')
    p_set.add_argument('field')
    p_set.add_argument('value')

    args = parser.parse_args()
    if not args.cmd:
        parser.print_help()
        sys.exit(0)

    data = load()
    {
        'list': cmd_list,
        'bump': cmd_bump,
        'touch': cmd_touch,
        'add': cmd_add,
        'remove': cmd_remove,
        'get': cmd_get,
        'set': cmd_set,
    }[args.cmd](data, args)


if __name__ == '__main__':
    main()
