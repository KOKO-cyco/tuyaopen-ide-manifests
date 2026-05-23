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

// GET /api/boards/:id - Get single board
router.get('/:id', asyncHandler(async (req, res) => {
  const boards = await manifestLoader.loadBoards();
  const board = boards?.items?.find((b) => b.id === req.params.id);

  if (!board) {
    return res.status(404).json({
      success: false,
      error: `Board "${req.params.id}" not found`,
    });
  }

  res.json({
    success: true,
    board,
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
  const updates = req.body;

  // Don't allow changing ID
  delete updates.id;
  delete updates.schemaVersion;

  // Merge updates
  Object.assign(board, updates);

  // Validate updated board
  const validation = validator.validateBoard(board);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  // Save manifest
  await manifestLoader.saveBoardsIndex(boards);

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
