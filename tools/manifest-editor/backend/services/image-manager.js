import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { config } from '../../config.js';
import { manifestLoader } from './manifest-loader.js';

class ImageManager {
  async uploadImage(boardId, filePath, filename) {
    try {
      // Create board-specific image directory
      const boardImageDir = path.join(config.paths.images, boardId);
      await fs.mkdir(boardImageDir, { recursive: true });

      // Resize and optimize image
      const targetPath = path.join(boardImageDir, filename);
      const metadata = await sharp(filePath)
        .resize(config.imageMaxWidth, config.imageMaxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: config.imageQuality })
        .toFile(targetPath);

      // Get file stats
      const stats = await fs.stat(targetPath);

      // Return relative path for manifest
      const relativePath = `images/${boardId}/${filename}`;

      return {
        success: true,
        url: relativePath,
        filename,
        size: stats.size,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      console.error('Error uploading image:', error.message);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async deleteImage(boardId, filename) {
    try {
      const imagePath = path.join(config.paths.images, boardId, filename);

      // Check if file exists
      await fs.access(imagePath);

      // Delete file
      await fs.unlink(imagePath);

      // Try to remove directory if empty
      try {
        const boardDir = path.join(config.paths.images, boardId);
        const files = await fs.readdir(boardDir);
        if (files.length === 0) {
          await fs.rmdir(boardDir);
        }
      } catch {
        // Directory not empty or doesn't exist, ignore
      }

      return { success: true, message: 'Image deleted' };
    } catch (error) {
      console.error('Error deleting image:', error.message);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  async getImageUrl(boardId, filename) {
    try {
      const imagePath = path.join(config.paths.images, boardId, filename);
      await fs.access(imagePath);
      return `images/${boardId}/${filename}`;
    } catch {
      return null;
    }
  }

  async getBoardImages(boardId) {
    try {
      const boardImageDir = path.join(config.paths.images, boardId);

      try {
        await fs.access(boardImageDir);
      } catch {
        return [];
      }

      const files = await fs.readdir(boardImageDir);
      const images = [];

      for (const file of files) {
        const filePath = path.join(boardImageDir, file);
        const stats = await fs.stat(filePath);

        images.push({
          filename: file,
          url: `images/${boardId}/${file}`,
          size: stats.size,
        });
      }

      return images;
    } catch (error) {
      console.error('Error getting board images:', error.message);
      throw new Error(`Failed to get board images: ${error.message}`);
    }
  }

  async updateBoardImage(boardId, imageUrl) {
    try {
      const boards = await manifestLoader.loadBoards();

      // Find and update the board
      if (boards.items) {
        const board = boards.items.find((b) => b.id === boardId);
        if (board) {
          if (!board.image) {
            board.image = {};
          }
          board.image.url = imageUrl;

          // Save updated manifest
          await manifestLoader.saveBoardsIndex(boards);
          return { success: true };
        }
      }

      throw new Error(`Board "${boardId}" not found`);
    } catch (error) {
      console.error('Error updating board image:', error.message);
      throw new Error(`Failed to update board image: ${error.message}`);
    }
  }
}

export const imageManager = new ImageManager();
