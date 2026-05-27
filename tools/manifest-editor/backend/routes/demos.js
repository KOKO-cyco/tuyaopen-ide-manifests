import express from 'express';
import { manifestLoader } from '../services/manifest-loader.js';
import { gitSync } from '../services/git-sync.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = express.Router();

// GET /api/demos - List all demos
router.get('/', asyncHandler(async (req, res) => {
  const demos = await manifestLoader.loadDemos();
  res.json({
    success: true,
    demos: demos?.items || [],
    count: demos?.items?.length || 0,
  });
}));

// GET /api/demos/:id - Get single demo detail
router.get('/:id', asyncHandler(async (req, res) => {
  const detail = await manifestLoader.loadDemoDetail(req.params.id);
  if (!detail) {
    const demos = await manifestLoader.loadDemos();
    const item = demos?.items?.find(d => d.id === req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: `Demo "${req.params.id}" not found` });
    }
    return res.json({ success: true, demo: item });
  }
  res.json({ success: true, demo: detail });
}));

// POST /api/demos - Create new demo
router.post('/', asyncHandler(async (req, res) => {
  const { id, name, summary, tags, boards, compatibilityType, source, defaultConfig, configs, documentation, publish } = req.body;

  if (!id || !name?.en || !source?.repo || !source?.subpath) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: id, name.en, source.repo, source.subpath',
    });
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'ID must be kebab-case (lowercase letters, numbers, hyphens)',
    });
  }

  // Validate configs keys if provided
  if (configs && typeof configs === 'object') {
    const invalidKeys = Object.keys(configs).filter(k => !/^[A-Za-z0-9][A-Za-z0-9_.]*$/.test(k));
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid kconfigId keys in configs: ${invalidKeys.join(', ')}. Must be alphanumeric with underscores/dots.`,
      });
    }
    for (const [key, val] of Object.entries(configs)) {
      if (!val.file || typeof val.file !== 'string') {
        return res.status(400).json({
          success: false,
          error: `configs["${key}"].file is required and must be a string`,
        });
      }
    }
  }

  const demos = await manifestLoader.loadDemos();
  if (demos.items.some(d => d.id === id)) {
    return res.status(409).json({ success: false, error: `Demo "${id}" already exists` });
  }

  // Derive boardConfigs from configs keys for backward compat
  const derivedBoardConfigs = configs ? Object.keys(configs) : undefined;

  const indexEntry = {
    id,
    name: name || { en: '' },
    summary: summary || { en: '', 'zh-CN': '' },
    tags: tags || [],
    boards: boards || [],
    compatibilityType: compatibilityType || 'universal',
    source: {
      repo: source.repo,
      subpath: source.subpath,
      ref: source.ref || 'master',
    },
    publish: publish !== false,
  };

  demos.items.push(indexEntry);
  await manifestLoader.saveDemosIndex(demos);

  const detailEntry = {
    ...indexEntry,
    defaultConfig: defaultConfig || {},
    configs: configs || {},
    boardConfigs: derivedBoardConfigs || [],
    documentation: documentation || { readme: { en: null, 'zh-CN': null } },
  };
  await manifestLoader.saveDemoDetail(id, detailEntry);

  if (req.body.autoCommit !== false) {
    await gitSync.autoCommit(`feat(demos): add ${id}`);
  }

  res.status(201).json({ success: true, demo: detailEntry, message: `Demo "${id}" created` });
}));

// PATCH /api/demos/:id - Update demo
router.patch('/:id', asyncHandler(async (req, res) => {
  const demos = await manifestLoader.loadDemos();
  const idx = demos.items.findIndex(d => d.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: `Demo "${req.params.id}" not found` });
  }

  const updates = { ...req.body };
  delete updates.id;
  delete updates.autoCommit;

  // Validate configs keys if provided
  if (updates.configs && typeof updates.configs === 'object') {
    const invalidKeys = Object.keys(updates.configs).filter(k => !/^[A-Za-z0-9][A-Za-z0-9_.]*$/.test(k));
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid kconfigId keys in configs: ${invalidKeys.join(', ')}. Must be alphanumeric with underscores/dots.`,
      });
    }
    // Regenerate boardConfigs from configs keys for backward compat
    updates.boardConfigs = Object.keys(updates.configs);
  }

  // Update index entry (only index-level fields)
  const indexFields = ['name', 'summary', 'tags', 'boards', 'compatibilityType', 'source', 'publish'];
  for (const key of indexFields) {
    if (updates[key] !== undefined) {
      demos.items[idx][key] = updates[key];
    }
  }
  await manifestLoader.saveDemosIndex(demos);

  // Update detail file
  let detail = await manifestLoader.loadDemoDetail(req.params.id);
  if (!detail) {
    detail = { ...demos.items[idx] };
  }
  Object.assign(detail, updates);
  detail.id = req.params.id;
  await manifestLoader.saveDemoDetail(req.params.id, detail);

  if (req.body.autoCommit !== false) {
    await gitSync.autoCommit(`fix(demos): update ${req.params.id}`);
  }

  res.json({ success: true, demo: detail, message: `Demo "${req.params.id}" updated` });
}));

// DELETE /api/demos/:id - Delete demo
router.delete('/:id', asyncHandler(async (req, res) => {
  const demos = await manifestLoader.loadDemos();
  const idx = demos.items.findIndex(d => d.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: `Demo "${req.params.id}" not found` });
  }

  const removed = demos.items.splice(idx, 1);
  await manifestLoader.saveDemosIndex(demos);
  await manifestLoader.deleteDemoDetail(req.params.id);

  if (req.body?.autoCommit !== false) {
    await gitSync.autoCommit(`chore(demos): remove ${req.params.id}`);
  }

  res.json({ success: true, demo: removed[0], message: `Demo "${req.params.id}" deleted` });
}));

export default router;
