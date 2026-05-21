#!/usr/bin/env python3
"""
skills-index.py — manage skills/index.json in this repo

Run from the repo root (tuyaopen-ide-manifests) or from any directory:
  python scripts/skills-index.py list [--surface embedded|cloud|miniapp]
  python scripts/skills-index.py get <id>
  python scripts/skills-index.py add <id> --surface <s> --order <n> --payload <p> [options]
  python scripts/skills-index.py remove <id> [<id2> ...]
  python scripts/skills-index.py enable <id> [<id2> ...]
  python scripts/skills-index.py disable <id> [<id2> ...]
  python scripts/skills-index.py reorder <id> <order>
  python scripts/skills-index.py relate <id> <related-id> [<related-id2> ...]
  python scripts/skills-index.py unrelate <id> <related-id> [<related-id2> ...]
  python scripts/skills-index.py set <id> <field> <value>
  python scripts/skills-index.py touch

Examples:
  python scripts/skills-index.py list
  python scripts/skills-index.py list --surface cloud
  python scripts/skills-index.py add tuyaopen-ota --surface embedded --order 27 --payload embedded/tuyaopen-ota
  python scripts/skills-index.py remove tuyaopen-dp-add tuyaopen-dp-list
  python scripts/skills-index.py enable tuyaopen-flash-monitor
  python scripts/skills-index.py disable tuyaopen-build
  python scripts/skills-index.py reorder tuya-iot-platform 5
  python scripts/skills-index.py relate tuyaopen-build tuyaopen-flash-monitor tuyaopen-dev-loop
  python scripts/skills-index.py unrelate tuyaopen-build tuyaopen-flash-monitor
  python scripts/skills-index.py set tuyaopen-build defaultEnabled false
  python scripts/skills-index.py touch
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

INDEX_PATH = os.path.join(os.path.dirname(__file__), '..', 'skills', 'index.json')


def load():
    with open(INDEX_PATH, encoding='utf-8') as f:
        return json.load(f)


def save(data):
    tmp = INDEX_PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    os.replace(tmp, INDEX_PATH)


def get_items(data):
    return data if isinstance(data, list) else data.get('items', [])


def find_skill(items, skill_id):
    for i, s in enumerate(items):
        if s.get('id') == skill_id:
            return i, s
    return -1, None


def require_skill(items, skill_id):
    idx, skill = find_skill(items, skill_id)
    if skill is None:
        print(f'Not found: {skill_id}', file=sys.stderr)
        sys.exit(1)
    return idx, skill


def cmd_list(data, args):
    items = get_items(data)
    if args.surface:
        items = [s for s in items if s.get('surface') == args.surface]
    published = data.get('publishedAt', '') if isinstance(data, dict) else ''
    print(f'publishedAt={published}  ({len(items)} skills)')
    for s in sorted(items, key=lambda x: x.get('order', 9999)):
        enabled = str(s.get('defaultEnabled', False)).lower()
        surface = s.get('surface', '')
        name_en = s.get('name', {}).get('en', '') if isinstance(s.get('name'), dict) else ''
        print(f'  {s["order"]:>3}  {s["id"]:<40} [{surface:<8}] defaultEnabled={enabled:<5}  {name_en}')


def cmd_get(data, args):
    items = get_items(data)
    _, skill = require_skill(items, args.id)
    print(json.dumps(skill, indent=2, ensure_ascii=False))


def cmd_add(data, args):
    items = get_items(data)
    if any(s.get('id') == args.id for s in items):
        print(f'Already exists: {args.id}', file=sys.stderr)
        sys.exit(1)

    entry = {'id': args.id, 'order': args.order}

    if args.name_en or args.name_zh:
        entry['name'] = {'en': args.name_en or args.id, 'zh-CN': args.name_zh or args.id}

    entry['surface'] = args.surface

    if args.summary_en or args.summary_zh:
        entry['summary'] = {'en': args.summary_en or '', 'zh-CN': args.summary_zh or ''}

    if args.when_en or args.when_zh:
        entry['whenToUse'] = {'en': args.when_en or '', 'zh-CN': args.when_zh or ''}

    if args.tags:
        entry['tags'] = args.tags

    if args.commands:
        entry['commands'] = args.commands

    entry['defaultEnabled'] = args.enabled
    entry['installPayload'] = args.payload

    if args.local_path:
        entry['source'] = {'localPath': args.local_path}
    elif args.repo:
        entry['source'] = {'repo': args.repo, 'subpath': args.subpath or '', 'ref': args.ref or 'master'}

    items.append(entry)
    items.sort(key=lambda x: x.get('order', 9999))

    if isinstance(data, list):
        data[:] = items
    else:
        data['items'] = items
    save(data)
    print(f'Added: {args.id}  (order={args.order}, surface={args.surface})')


def cmd_remove(data, args):
    to_remove = set(args.ids)
    items = get_items(data)
    removed = [i for i in args.ids if any(s.get('id') == i for s in items)]
    not_found = [i for i in args.ids if not any(s.get('id') == i for s in items)]

    def clean(s):
        related = s.get('related')
        if not isinstance(related, list):
            return s
        filtered = [r for r in related if r not in to_remove]
        if len(filtered) == len(related):
            return s
        s = dict(s)
        if filtered:
            s['related'] = filtered
        else:
            del s['related']
        return s

    remaining = [clean(s) for s in items if s.get('id') not in to_remove]

    if isinstance(data, list):
        data[:] = remaining
    else:
        data['items'] = remaining
    save(data)

    if removed:
        print(f'Removed ({len(removed)}): {", ".join(removed)}')
    if not_found:
        print(f'Not found (skipped): {", ".join(not_found)}', file=sys.stderr)
    print(f'{len(items)} → {len(remaining)} skills')


def cmd_enable(data, args):
    _set_enabled(data, args.ids, True)


def cmd_disable(data, args):
    _set_enabled(data, args.ids, False)


def _set_enabled(data, ids, value):
    items = get_items(data)
    changed = []
    for skill_id in ids:
        _, skill = require_skill(items, skill_id)
        if skill.get('defaultEnabled') != value:
            skill['defaultEnabled'] = value
            changed.append(skill_id)
    if changed:
        save(data)
        state = 'enabled' if value else 'disabled'
        print(f'{state}: {", ".join(changed)}')
    else:
        print('No changes (already in target state)')


def cmd_reorder(data, args):
    items = get_items(data)
    _, skill = require_skill(items, args.id)
    before = skill.get('order')
    skill['order'] = args.order
    items.sort(key=lambda x: x.get('order', 9999))
    if isinstance(data, list):
        data[:] = items
    else:
        data['items'] = items
    save(data)
    print(f'{args.id}.order: {before} → {args.order}')


def cmd_relate(data, args):
    items = get_items(data)
    _, skill = require_skill(items, args.id)
    existing = skill.get('related', [])
    added = [r for r in args.related_ids if r not in existing]
    if not added:
        print('No changes (all already in related)')
        return
    skill['related'] = existing + added
    save(data)
    print(f'{args.id}.related: added {added}')


def cmd_unrelate(data, args):
    items = get_items(data)
    _, skill = require_skill(items, args.id)
    existing = skill.get('related', [])
    to_remove = set(args.related_ids)
    remaining = [r for r in existing if r not in to_remove]
    if len(remaining) == len(existing):
        print('No changes (none found in related)')
        return
    if remaining:
        skill['related'] = remaining
    elif 'related' in skill:
        del skill['related']
    save(data)
    removed = [r for r in args.related_ids if r in set(existing)]
    print(f'{args.id}.related: removed {removed}')


def cmd_set(data, args):
    items = get_items(data)
    idx, skill = require_skill(items, args.id)
    try:
        value = json.loads(args.value)
    except json.JSONDecodeError:
        value = args.value
    before = skill.get(args.field)
    skill[args.field] = value
    if isinstance(data, list):
        data[idx] = skill
    else:
        data['items'][idx] = skill
    save(data)
    print(f'{args.id}.{args.field}: {json.dumps(before)} → {json.dumps(value)}')


def cmd_touch(data, _args):
    if isinstance(data, list):
        print('Root is an array; no publishedAt to update', file=sys.stderr)
        sys.exit(1)
    before = data.get('publishedAt')
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    data['publishedAt'] = now
    save(data)
    print(f'publishedAt: {before} → {now}')


def main():
    parser = argparse.ArgumentParser(
        prog='skills-index.py',
        description='Manage skills/index.json',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest='cmd')

    p_list = sub.add_parser('list', help='list skills')
    p_list.add_argument('--surface', choices=['embedded', 'cloud', 'miniapp'], help='filter by surface')

    p_get = sub.add_parser('get', help='print a skill entry as JSON')
    p_get.add_argument('id')

    p_add = sub.add_parser('add', help='add a new skill entry')
    p_add.add_argument('id')
    p_add.add_argument('--surface', required=True, choices=['embedded', 'cloud', 'miniapp'])
    p_add.add_argument('--order', required=True, type=int)
    p_add.add_argument('--payload', required=True, dest='payload', metavar='INSTALL_PAYLOAD')
    p_add.add_argument('--name-en', default='')
    p_add.add_argument('--name-zh', default='')
    p_add.add_argument('--summary-en', default='')
    p_add.add_argument('--summary-zh', default='')
    p_add.add_argument('--when-en', default='')
    p_add.add_argument('--when-zh', default='')
    p_add.add_argument('--tags', nargs='+', default=[])
    p_add.add_argument('--commands', nargs='+', default=[], metavar='COMMAND')
    p_add.add_argument('--enabled', action='store_true', default=False)
    p_add.add_argument('--local-path', default='')
    p_add.add_argument('--repo', default='')
    p_add.add_argument('--subpath', default='')
    p_add.add_argument('--ref', default='master')

    p_remove = sub.add_parser('remove', help='remove skills by id')
    p_remove.add_argument('ids', nargs='+', metavar='id')

    p_enable = sub.add_parser('enable', help='set defaultEnabled=true')
    p_enable.add_argument('ids', nargs='+', metavar='id')

    p_disable = sub.add_parser('disable', help='set defaultEnabled=false')
    p_disable.add_argument('ids', nargs='+', metavar='id')

    p_reorder = sub.add_parser('reorder', help='set the order field')
    p_reorder.add_argument('id')
    p_reorder.add_argument('order', type=int)

    p_relate = sub.add_parser('relate', help='add entries to related[]')
    p_relate.add_argument('id')
    p_relate.add_argument('related_ids', nargs='+', metavar='related-id')

    p_unrelate = sub.add_parser('unrelate', help='remove entries from related[]')
    p_unrelate.add_argument('id')
    p_unrelate.add_argument('related_ids', nargs='+', metavar='related-id')

    p_set = sub.add_parser('set', help='set any top-level field (value is JSON-parsed)')
    p_set.add_argument('id')
    p_set.add_argument('field')
    p_set.add_argument('value')

    sub.add_parser('touch', help='set publishedAt to current UTC time')

    args = parser.parse_args()
    if not args.cmd:
        parser.print_help()
        sys.exit(0)

    data = load()
    {
        'list': cmd_list,
        'get': cmd_get,
        'add': cmd_add,
        'remove': cmd_remove,
        'enable': cmd_enable,
        'disable': cmd_disable,
        'reorder': cmd_reorder,
        'relate': cmd_relate,
        'unrelate': cmd_unrelate,
        'set': cmd_set,
        'touch': cmd_touch,
    }[args.cmd](data, args)


if __name__ == '__main__':
    main()
