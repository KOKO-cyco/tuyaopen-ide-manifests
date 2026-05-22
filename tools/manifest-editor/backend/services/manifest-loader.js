import fs from 'fs/promises';
import path from 'path';
import { config } from '../../config.js';

class ManifestLoader {
  constructor() {
    this.cache = {
      boards: null,
      demos: null,
      platforms: null,
    };
    this.lastLoaded = {
      boards: null,
      demos: null,
      platforms: null,
    };
  }

  async loadBoards(forceRefresh = false) {
    try {
      const filePath = path.join(config.paths.boards, 'index.json');

      // Check if file exists
      await fs.access(filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      this.cache.boards = data;
      this.lastLoaded.boards = new Date();

      return data;
    } catch (error) {
      console.error('Error loading boards manifest:', error.message);
      throw new Error(`Failed to load boards manifest: ${error.message}`);
    }
  }

  async loadDemos(forceRefresh = false) {
    try {
      const filePath = path.join(config.paths.demos, 'index.json');

      await fs.access(filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      this.cache.demos = data;
      this.lastLoaded.demos = new Date();

      return data;
    } catch (error) {
      console.error('Error loading demos manifest:', error.message);
      throw new Error(`Failed to load demos manifest: ${error.message}`);
    }
  }

  async loadPlatforms(forceRefresh = false) {
    try {
      const filePath = path.join(config.paths.platforms, 'index.json');

      await fs.access(filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      this.cache.platforms = data;
      this.lastLoaded.platforms = new Date();

      return data;
    } catch (error) {
      console.error('Error loading platforms manifest:', error.message);
      throw new Error(`Failed to load platforms manifest: ${error.message}`);
    }
  }

  getBoards() {
    return this.cache.boards;
  }

  getDemos() {
    return this.cache.demos;
  }

  getPlatforms() {
    return this.cache.platforms;
  }

  async saveBoardsIndex(data) {
    try {
      const filePath = path.join(config.paths.boards, 'index.json');
      const jsonContent = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonContent, 'utf-8');
      this.cache.boards = data;
      return true;
    } catch (error) {
      console.error('Error saving boards manifest:', error.message);
      throw new Error(`Failed to save boards manifest: ${error.message}`);
    }
  }
}

export const manifestLoader = new ManifestLoader();
