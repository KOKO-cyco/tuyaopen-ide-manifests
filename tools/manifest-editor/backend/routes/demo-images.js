import express from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../../config.js';
import { imageManager } from '../services/image-manager.js';
import { gitSync } from '../services/git-sync.js';
import { asyncHandler } from '../middleware/error-handler.js';
import fs from 'fs/promises';

const router = express.Router();

// Multer configuration (reuse uploads dir)
const uploadsDir = config.paths.uploads;
try {
  await fs.mkdir(uploadsDir, { recursive: true });
} catch {
  // Directory already exists
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `demo-${timestamp}${ext}`);
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

// POST /api/demo-images/upload - Upload image for a demo
router.post('/upload', upload.single('image'), asyncHandler(async (req, res) => {
  const { demoId, filename } = req.body;
  const uploadedFile = req.file;

  if (!demoId) {
    if (uploadedFile) {
      await fs.unlink(uploadedFile.path).catch(() => {});
    }
    return res.status(400).json({
      success: false,
      error: 'demoId is required',
    });
  }

  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      error: 'No image file provided',
    });
  }

  try {
    const imageName = filename || `${demoId}.jpg`;

    const result = await imageManager.uploadDemoImage(demoId, uploadedFile.path, imageName, 'demo');

    await fs.unlink(uploadedFile.path).catch(() => {});

    if (req.body.autoUpdate !== 'false') {
      await imageManager.updateDemoImage(demoId, result.url);

      if (req.body.autoCommit !== 'false') {
        await gitSync.autoCommit(`assets(demos): add image for ${demoId}`);
      }
    }

    res.json({
      success: true,
      image: result,
      message: 'Demo image uploaded successfully',
    });
  } catch (error) {
    if (uploadedFile) {
      await fs.unlink(uploadedFile.path).catch(() => {});
    }
    throw error;
  }
}));

// GET /api/demo-images/:demoId - Get all images for a demo
router.get('/:demoId', asyncHandler(async (req, res) => {
  const images = await imageManager.getDemoImages(req.params.demoId);

  res.json({
    success: true,
    demoId: req.params.demoId,
    images,
    count: images.length,
  });
}));

// DELETE /api/demo-images/:demoId/:filename - Delete specific demo image
router.delete('/:demoId/:filename', asyncHandler(async (req, res) => {
  const { demoId, filename } = req.params;

  await imageManager.deleteDemoImage(demoId, filename);

  if (req.body?.autoCommit !== 'false') {
    await gitSync.autoCommit(`assets(demos): remove image for ${demoId}`);
  }

  res.json({
    success: true,
    message: `Image deleted for demo "${demoId}"`,
  });
}));

// Serve demo images statically
router.use('/', express.static(config.paths.demoImages));

export default router;
