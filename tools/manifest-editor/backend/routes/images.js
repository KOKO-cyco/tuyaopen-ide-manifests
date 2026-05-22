import express from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../../config.js';
import { imageManager } from '../services/image-manager.js';
import { gitSync } from '../services/git-sync.js';
import { asyncHandler } from '../middleware/error-handler.js';
import fs from 'fs/promises';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = config.paths.uploads;
try {
  await fs.mkdir(uploadsDir, { recursive: true });
} catch {
  // Directory already exists
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, WebP)'));
    }
  },
  limits: { fileSize: config.imageMaxSize },
});

// POST /api/images/upload - Upload image for a board
router.post('/upload', upload.single('image'), asyncHandler(async (req, res) => {
  const { boardId, filename } = req.body;
  const uploadedFile = req.file;

  if (!boardId) {
    // Clean up uploaded file
    if (uploadedFile) {
      await fs.unlink(uploadedFile.path).catch(() => {});
    }
    return res.status(400).json({
      success: false,
      error: 'boardId is required',
    });
  }

  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      error: 'No image file provided',
    });
  }

  try {
    // Use provided filename or generate one from original
    const imageName = filename || `board-${Date.now()}.jpg`;

    // Process and move image
    const result = await imageManager.uploadImage(boardId, uploadedFile.path, imageName);

    // Clean up temp file
    await fs.unlink(uploadedFile.path).catch(() => {});

    // Update board manifest if autoUpdate is true
    if (req.body.autoUpdate !== 'false') {
      await imageManager.updateBoardImage(boardId, result.url);

      // Auto-commit
      if (req.body.autoCommit !== 'false') {
        await gitSync.autoCommit(`assets(boards): add image for ${boardId}`);
      }
    }

    res.json({
      success: true,
      image: result,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    // Clean up temp file
    if (uploadedFile) {
      await fs.unlink(uploadedFile.path).catch(() => {});
    }
    throw error;
  }
}));

// GET /api/images/:boardId - Get all images for a board
router.get('/:boardId', asyncHandler(async (req, res) => {
  const images = await imageManager.getBoardImages(req.params.boardId);

  res.json({
    success: true,
    boardId: req.params.boardId,
    images,
    count: images.length,
  });
}));

// DELETE /api/images/:boardId/:filename - Delete specific image
router.delete('/:boardId/:filename', asyncHandler(async (req, res) => {
  const { boardId, filename } = req.params;

  await imageManager.deleteImage(boardId, filename);

  // Auto-commit
  if (req.body?.autoCommit !== 'false') {
    await gitSync.autoCommit(`assets(boards): remove image for ${boardId}`);
  }

  res.json({
    success: true,
    message: `Image deleted for board "${boardId}"`,
  });
}));

// Serve images statically
router.use('/', express.static(config.paths.images));

export default router;
