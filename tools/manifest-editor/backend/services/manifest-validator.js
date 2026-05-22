import Ajv from 'ajv';

const ajv = new Ajv();

const BOARD_SCHEMA = {
  type: 'object',
  properties: {
    schemaVersion: { type: 'number' },
    id: { type: 'string', pattern: '^[a-z0-9-]+$' },
    name: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            en: { type: 'string' },
            'zh-CN': { type: 'string' },
          },
          required: ['en'],
        },
      ],
    },
    summary: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            en: { type: 'string' },
            'zh-CN': { type: 'string' },
          },
        },
      ],
    },
    platformId: { type: 'string' },
    manufacturer: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            en: { type: 'string' },
            'zh-CN': { type: 'string' },
          },
        },
      ],
    },
    brand: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            en: { type: 'string' },
            'zh-CN': { type: 'string' },
          },
        },
      ],
    },
    image: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        alt: {
          oneOf: [
            { type: 'string' },
            {
              type: 'object',
              properties: {
                en: { type: 'string' },
                'zh-CN': { type: 'string' },
              },
            },
          ],
        },
      },
    },
    tags: { type: 'array', items: { type: 'string' } },
    purchaseLink: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            en: { type: 'string' },
            'zh-CN': { type: 'string' },
          },
        },
      ],
    },
    guideDocs: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            en: { type: 'string' },
            'zh-CN': { type: 'string' },
          },
        },
      ],
    },
    schematicLink: { type: 'string' },
  },
  required: ['schemaVersion', 'id', 'name', 'platformId'],
};

export class ManifestValidator {
  validateBoard(board) {
    const validate = ajv.compile(BOARD_SCHEMA);
    const valid = validate(board);

    return {
      valid,
      errors: valid ? [] : validate.errors?.map((err) => ({
        path: err.instancePath || '/root',
        message: err.message,
        keyword: err.keyword,
      })) || [],
    };
  }

  validateBoardId(id, allBoards) {
    const errors = [];

    // Check kebab-case
    if (!/^[a-z0-9-]+$/.test(id)) {
      errors.push('ID must be lowercase letters, numbers, and hyphens only (kebab-case)');
    }

    // Check uniqueness
    if (allBoards && allBoards.items && allBoards.items.some((b) => b.id === id)) {
      errors.push(`ID "${id}" already exists`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateUrl(url) {
    if (!url) return { valid: true };
    try {
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith('https')) {
        return { valid: false, errors: ['URL must use HTTPS protocol'] };
      }
      return { valid: true };
    } catch {
      return { valid: false, errors: ['Invalid URL format'] };
    }
  }

  validateLocalizedString(value) {
    if (typeof value === 'string') {
      return { valid: true };
    }

    if (typeof value === 'object' && value !== null) {
      if (typeof value.en !== 'string') {
        return { valid: false, errors: ['English (en) translation required'] };
      }
      return { valid: true };
    }

    return { valid: false, errors: ['Must be string or localized object'] };
  }
}

export const validator = new ManifestValidator();
