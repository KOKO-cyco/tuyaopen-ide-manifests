import express from 'express';
import { manifestLoader } from '../services/manifest-loader.js';
import { validator } from '../services/manifest-validator.js';
import { gitSync } from '../services/git-sync.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = express.Router();

// GET /api/boards - Get all boards
router.get('/', asyncHandler(async (req, res) => {
  const boards = await manifestLoader.loadBoards();

  res.json({
    success: true,
    boards: boards?.items || [],
    count: boards?.items?.length || 0,
    lastModified: new Date().toISOString(),
  });
}));

// GET /api/boards/:id - Get single board (index + detail merged)
router.get('/:id', asyncHandler(async (req, res) => {
  const boards = await manifestLoader.loadBoards();
  const board = boards?.items?.find((b) => b.id === req.params.id);

  if (!board) {
    return res.status(404).json({
      success: false,
      error: `Board "${req.params.id}" not found`,
    });
  }

  // Merge detail fields (kconfigId, scaffold, demos, peripheralPatterns, links)
  const detail = await manifestLoader.loadBoardDetail(req.params.id);
  const merged = { ...board };
  if (detail) {
    if (detail.kconfigId) merged.kconfigId = detail.kconfigId;
    if (detail.scaffold) merged.scaffold = detail.scaffold;
    if (detail.demos) merged.demos = detail.demos;
    if (detail.links) merged.links = detail.links;
    if (detail.peripheralPatterns) merged.peripheralPatterns = detail.peripheralPatterns;
  }

  res.json({
    success: true,
    board: merged,
  });
}));

// POST /api/boards - Create new board
router.post('/', asyncHandler(async (req, res) => {
  const { id, name, platformId, manufacturer, brand, summary, tags } = req.body;

  // Validate required fields
  if (!id || !name || !platformId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: id, name, platformId',
    });
  }

  // Create new board object
  const newBoard = {
    schemaVersion: 1,
    id,
    name,
    platformId,
    manufacturer: manufacturer || { en: 'Unknown' },
    brand: brand || { en: 'Ecosystem' },
    summary: summary || {},
    tags: tags || [],
    image: null,
  };

  // Validate board
  const validation = validator.validateBoard(newBoard);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  // Validate ID uniqueness
  const boards = await manifestLoader.loadBoards();
  const idValidation = validator.validateBoardId(id, boards);
  if (!idValidation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid board ID',
      errors: idValidation.errors,
    });
  }

  // Add to boards manifest
  if (!boards.items) {
    boards.items = [];
  }
  boards.items.push(newBoard);

  // Save manifest
  await manifestLoader.saveBoardsIndex(boards);

  // Auto-commit
  if (req.body.autoCommit !== false) {
    await gitSync.autoCommit(`feat(boards): add new board ${id}`);
  }

  res.status(201).json({
    success: true,
    board: newBoard,
    message: `Board "${id}" created successfully`,
  });
}));

// PATCH /api/boards/:id - Update board
router.patch('/:id', asyncHandler(async (req, res) => {
  const boards = await manifestLoader.loadBoards();
  const boardIndex = boards?.items?.findIndex((b) => b.id === req.params.id);

  if (boardIndex === -1) {
    return res.status(404).json({
      success: false,
      error: `Board "${req.params.id}" not found`,
    });
  }

  // Update board fields
  const board = boards.items[boardIndex];
  const updates = { ...req.body };

  // Don't allow changing ID
  delete updates.id;
  delete updates.schemaVersion;
  delete updates.autoCommit;

  // Validate kconfigId if provided
  if (updates.kconfigId !== undefined) {
    if (updates.kconfigId && !/^[A-Z0-9][A-Z0-9_.]*$/.test(updates.kconfigId)) {
      return res.status(400).json({
        success: false,
        error: 'kconfigId must be UPPER_CASE (letters, numbers, underscores, dots)',
      });
    }
  }

  // Validate scaffold.baseConfig keys
  if (updates.scaffold?.baseConfig) {
    const invalidKeys = Object.keys(updates.scaffold.baseConfig).filter(k => !k.startsWith('CONFIG_'));
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `scaffold.baseConfig keys must start with CONFIG_: ${invalidKeys.join(', ')}`,
      });
    }
  }

  // Fields that go to the index
  const indexFields = ['name', 'platformId', 'variantId', 'manufacturer', 'brand', 'summary', 'tags', 'image'];
  for (const key of indexFields) {
    if (updates[key] !== undefined) {
      board[key] = updates[key];
    }
  }

  // Validate updated board
  const validation = validator.validateBoard(board);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  // Save index
  await manifestLoader.saveBoardsIndex(boards);

  // Fields that go to the detail file: kconfigId, scaffold, demos, peripheralPatterns, links
  const detailFields = ['kconfigId', 'scaffold', 'demos', 'links'];
  const hasDetailUpdates = detailFields.some(k => updates[k] !== undefined);

  if (hasDetailUpdates) {
    let detail = await manifestLoader.loadBoardDetail(req.params.id);
    if (!detail) {
      detail = {
        schemaVersion: 1,
        id: req.params.id,
        name: board.name,
        summary: board.summary || {},
        brand: board.brand || {},
        manufacturer: board.manufacturer || {},
        platformId: board.platformId,
        variantId: board.variantId || board.platformId,
      };
    }
    for (const key of detailFields) {
      if (updates[key] !== undefined) {
        detail[key] = updates[key];
      }
    }
    await manifestLoader.saveBoardDetail(req.params.id, detail);
  }

  // Auto-commit
  if (req.body.autoCommit !== false) {
    await gitSync.autoCommit(`fix(boards): update ${req.params.id} metadata`);
  }

  res.json({
    success: true,
    board,
    message: `Board "${req.params.id}" updated successfully`,
  });
}));

// DELETE /api/boards/:id - Delete board
router.delete('/:id', asyncHandler(async (req, res) => {
  const boards = await manifestLoader.loadBoards();
  const boardIndex = boards?.items?.findIndex((b) => b.id === req.params.id);

  if (boardIndex === -1) {
    return res.status(404).json({
      success: false,
      error: `Board "${req.params.id}" not found`,
    });
  }

  // Remove board
  const removed = boards.items.splice(boardIndex, 1);

  // Save manifest
  await manifestLoader.saveBoardsIndex(boards);

  // Auto-commit
  if (req.body?.autoCommit !== false) {
    await gitSync.autoCommit(`chore(boards): remove ${req.params.id}`);
  }

  res.json({
    success: true,
    board: removed[0],
    message: `Board "${req.params.id}" deleted successfully`,
  });
}));

// POST /api/boards/:id/validate - Validate board
router.post('/:id/validate', asyncHandler(async (req, res) => {
  const board = req.body;

  if (!board) {
    return res.status(400).json({
      success: false,
      error: 'No board data provided',
    });
  }

  const validation = validator.validateBoard(board);

  res.json({
    success: validation.valid,
    valid: validation.valid,
    errors: validation.errors,
  });
}));

// GET /api/boards/:id/peripherals - Get peripheral patterns for a board
router.get('/:id/peripherals', asyncHandler(async (req, res) => {
  const detail = await manifestLoader.loadBoardDetail(req.params.id);
  if (!detail) {
    return res.json({ success: true, peripheralPatterns: {} });
  }
  res.json({ success: true, peripheralPatterns: detail.peripheralPatterns || {} });
}));

// PATCH /api/boards/:id/peripherals - Update peripheral patterns
router.patch('/:id/peripherals', asyncHandler(async (req, res) => {
  const { peripheralPatterns } = req.body;
  if (!peripheralPatterns || typeof peripheralPatterns !== 'object') {
    return res.status(400).json({ success: false, error: 'Missing peripheralPatterns object' });
  }

  let detail = await manifestLoader.loadBoardDetail(req.params.id);
  if (!detail) {
    const boards = await manifestLoader.loadBoards();
    const item = boards?.items?.find(b => b.id === req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: `Board "${req.params.id}" not found` });
    }
    detail = {
      schemaVersion: 1,
      id: req.params.id,
      name: item.name,
      summary: item.summary || {},
      brand: item.brand || {},
      manufacturer: item.manufacturer || {},
      platformId: item.platformId,
      variantId: item.variantId || item.platformId,
    };
  }

  detail.peripheralPatterns = peripheralPatterns;
  await manifestLoader.saveBoardDetail(req.params.id, detail);

  if (req.body.autoCommit !== false) {
    await gitSync.autoCommit(`feat(boards): update ${req.params.id} peripheral patterns`);
  }

  res.json({ success: true, peripheralPatterns, message: `Peripheral patterns updated for "${req.params.id}"` });
}));

export default router;
