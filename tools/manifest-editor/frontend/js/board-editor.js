// Board Editor module

import { apiClient } from './api-client.js';
import { escapeHtml, showNotification, showError, getLocalizedString, setLocalizedString } from './utils.js';
import { openImageUploadModal } from './image-uploader.js';
import i18n from './i18n.js';

let globalTagsList = [];

export async function initGlobalTags() {
  try {
    const result = await apiClient.get('/api/status/tags');
    if (result.success && result.tags) {
      globalTagsList = result.tags.map(t => ({
        id: t.id,
        label: i18n.getLanguage() === 'zh-CN' ? t['zh-CN'] : t.en,
        en: t.en,
        zh: t['zh-CN'],
      }));
    }
  } catch (error) {
    console.error('Error loading tags:', error);
  }
}

function validateHttpsUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function renderBoardForm(board = null) {
  const isNew = !board;
  const title = isNew ? 'Create New Board' : 'Edit Board';

  const formHtml = `
    <form id="boardForm" class="board-form" style="max-width: none; width: 100%; padding: 24px;">
      <!-- Quality Guidance Banner -->
      <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <div style="font-weight: 600; color: #0c4a6e; margin-bottom: 8px;">💡 质量提示</div>
        <div style="color: #0c4a6e; font-size: 0.95em; line-height: 1.6;">
          <strong>优质的开发板信息是开发者的第一步。</strong> 请认真完整地填写以下内容：
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>✓ 准确的Board ID - 与TuyaOpen SDK中的board.config匹配</li>
            <li>✓ 清晰的描述 - 用简明的语言说明开发板的功能和特性</li>
            <li>✓ 完整的文档链接 - 提供原理图、用户指南等重要资源</li>
            <li>✓ 正确的采购链接 - 帮助开发者快速获取硬件</li>
          </ul>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label required" for="boardId">Board ID</label>
        <div style="background-color: var(--color-warning); color: var(--color-fg); padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 0.9em; border-left: 4px solid #f59e0b;">
          <strong>⚠️ 关键字段:</strong> Board ID 必须与 TuyaOpen SDK 中 board.config 完全匹配。创建后无法更改！
        </div>
        <input
          type="text"
          id="boardId"
          name="id"
          class="form-input"
          pattern="^[a-z0-9-]+$"
          placeholder="例如: tuya-t5ai-board"
          value="${board ? escapeHtml(board.id) : ''}"
          ${!isNew ? 'readonly' : ''}
          required
        >
        <small style="color: var(--color-muted);">格式: 小写字母、数字、连字符 (kebab-case)</small>
        <div class="form-error" id="idError"></div>
      </div>

      <!-- EN/ZH Pair: Board Name -->
      <div class="form-group form-row-2col">
        <div class="form-col-half">
          <label class="form-label required" for="boardName">Board Name (English)</label>
          <input
            type="text"
            id="boardName"
            name="name_en"
            class="form-input"
            placeholder="e.g., Tuya T5AI Development Board"
            value="${board ? escapeHtml(getLocalizedString(board.name) || board.name?.en || '') : ''}"
            required
          >
          <small style="color: var(--color-muted);">Official name, concise and accurate</small>
        </div>
        <div class="form-col-half">
          <label class="form-label" for="boardNameZh">开发板名称 (中文)</label>
          <input
            type="text"
            id="boardNameZh"
            name="name_zh"
            class="form-input"
            placeholder="例如: 涂鸦 T5AI 开发板"
            value="${board ? escapeHtml(board.name?.['zh-CN'] || '') : ''}"
          >
          <small style="color: var(--color-muted);">中文官方名称</small>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label required" for="platformId">Chip Platform / 芯片平台</label>
        <select id="platformId" name="platformId" class="form-select" required>
          <option value="">-- Select Platform / 选择平台 --</option>
          ${board ? `<option value="${escapeHtml(board.platformId)}" selected>${escapeHtml(board.platformId)}</option>` : ''}
        </select>
        <small style="color: var(--color-muted);">Select the chip platform this board is based on</small>
        <div class="form-error" id="platformError"></div>
      </div>

      <!-- EN/ZH Pair: Summary -->
      <div class="form-group form-row-2col">
        <div class="form-col-half">
          <label class="form-label" for="boardSummary">Function Description (English)</label>
          <textarea
            id="boardSummary"
            name="summary_en"
            class="form-textarea"
            placeholder="e.g., High-performance board with WiFi, BLE, AI acceleration, built-in microphone and LED"
            style="min-height: 80px;"
          >${board ? escapeHtml(getLocalizedString(board.summary) || board.summary?.en || '') : ''}</textarea>
          <small style="color: var(--color-muted);">Concise description of key features and capabilities</small>
        </div>
        <div class="form-col-half">
          <label class="form-label" for="boardSummaryZh">功能描述 (中文)</label>
          <textarea
            id="boardSummaryZh"
            name="summary_zh"
            class="form-textarea"
            placeholder="功能描述的中文版本"
            style="min-height: 80px;"
          >${board ? escapeHtml(board.summary?.['zh-CN'] || '') : ''}</textarea>
          <small style="color: var(--color-muted);">中文版功能描述</small>
        </div>
      </div>

      <!-- EN/ZH Pair: Manufacturer & Brand -->
      <div class="form-group form-row-2col">
        <div class="form-col-half">
          <label class="form-label" for="manufacturer">Manufacturer / 制造商</label>
          <input
            type="text"
            id="manufacturer"
            name="manufacturer"
            class="form-input"
            placeholder="e.g., Tuya, Espressif"
            value="${board ? escapeHtml(getLocalizedString(board.manufacturer) || board.manufacturer?.en || '') : ''}"
          >
          <small style="color: var(--color-muted);">Board manufacturer name</small>
        </div>
        <div class="form-col-half">
          <label class="form-label" for="brand">Brand / Ecosystem / 品牌/生态</label>
          <input
            type="text"
            id="brand"
            name="brand"
            class="form-input"
            placeholder="e.g., Tuya Official, 生态伙伴"
            value="${board ? escapeHtml(getLocalizedString(board.brand) || board.brand?.en || '') : ''}"
          >
          <small style="color: var(--color-muted);">Official/Ecosystem Partner indicator</small>
        </div>
      </div>

      <!-- Tags Selection -->
      <div class="form-group">
        <label class="form-label" for="tags">Tags / 标签</label>
        <div id="tagsContainer" class="tags-selector">
          <div id="selectedTags" class="tags-selected" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;"></div>
          <select id="tags" name="tags" class="form-select" multiple style="min-height: 120px;">
            <!-- Options populated by JavaScript -->
          </select>
        </div>
        <small style="color: var(--color-muted);">Select from available tags. Tags are managed globally from tags.json registry.</small>
      </div>

      <!-- Links: Schematic -->
      <div class="form-group">
        <label class="form-label" for="schematicLink">Schematic Link (HTTPS) / 原理图链接</label>
        <input
          type="url"
          id="schematicLink"
          name="schematicLink"
          class="form-input url-input"
          placeholder="https://..."
          value="${board ? escapeHtml(board.schematicLink || '') : ''}"
          data-url-type="schematicLink"
        >
        <small style="color: var(--color-muted);">Direct link to board schematic PDF or image</small>
        <div class="form-error" id="schematicError"></div>
      </div>

      <!-- EN/ZH Pair: Guide Docs -->
      <div class="form-group form-row-2col">
        <div class="form-col-half">
          <label class="form-label" for="guideDocs">User Manual (English) / 用户手册</label>
          <input
            type="url"
            id="guideDocs"
            name="guideDocs_en"
            class="form-input url-input"
            placeholder="https://..."
            value="${board ? escapeHtml(board.guideDocs?.en || '') : ''}"
            data-url-type="guideDocs_en"
          >
          <small style="color: var(--color-muted);">User guide with pin definitions and usage</small>
          <div class="form-error" id="guideDocsError"></div>
        </div>
        <div class="form-col-half">
          <label class="form-label" for="guideDocsZh">用户手册 (中文)</label>
          <input
            type="url"
            id="guideDocsZh"
            name="guideDocs_zh"
            class="form-input url-input"
            placeholder="https://..."
            value="${board ? escapeHtml(board.guideDocs?.['zh-CN'] || '') : ''}"
            data-url-type="guideDocs_zh"
          >
          <small style="color: var(--color-muted);">中文版用户手册</small>
          <div class="form-error" id="guideDocsZhError"></div>
        </div>
      </div>

      <!-- EN/ZH Pair: Purchase Links -->
      <div class="form-group form-row-2col">
        <div class="form-col-half">
          <label class="form-label" for="purchaseLink">Purchase Link (English) / 采购链接</label>
          <input
            type="url"
            id="purchaseLink"
            name="purchaseLink_en"
            class="form-input url-input"
            placeholder="https://..."
            value="${board ? escapeHtml(board.purchaseLink?.en || '') : ''}"
            data-url-type="purchaseLink_en"
          >
          <small style="color: var(--color-muted);">Official or authorized sales channel</small>
          <div class="form-error" id="purchaseLinkError"></div>
        </div>
        <div class="form-col-half">
          <label class="form-label" for="purchaseLinkZh">采购链接 (中文)</label>
          <input
            type="url"
            id="purchaseLinkZh"
            name="purchaseLink_zh"
            class="form-input url-input"
            placeholder="https://..."
            value="${board ? escapeHtml(board.purchaseLink?.['zh-CN'] || '') : ''}"
            data-url-type="purchaseLink_zh"
          >
          <small style="color: var(--color-muted);">中文采购渠道</small>
          <div class="form-error" id="purchaseLinkZhError"></div>
        </div>
      </div>

      <!-- Image Section -->
      <div class="form-group">
        <label class="form-label">Board Image</label>
        ${board ? `
          <div class="image-upload-inline">
            <!-- Image Source Tabs -->
            <div style="display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid var(--color-border); padding-bottom: 8px;">
              <button type="button" class="image-source-tab active" data-source="file" style="background: none; border: none; padding: 8px; cursor: pointer; font-weight: 500; color: var(--color-primary);">
                📁 Upload File
              </button>
              <button type="button" class="image-source-tab" data-source="url" style="background: none; border: none; padding: 8px; cursor: pointer; font-weight: 500; color: var(--color-muted);">
                🔗 From URL
              </button>
            </div>

            <!-- File Upload -->
            <div id="imageSourceFile" class="image-source-content">
              <div id="imageUploadZone" class="image-upload-zone">
                <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p class="upload-text">Drag and drop image here or <strong>click to select</strong></p>
                <input type="file" id="boardImageInput" style="display: none;" accept="image/*" data-board-id="${escapeHtml(board.id)}">
              </div>
              <div id="imagePreview" class="image-preview" style="display: none;">
                <img id="previewImage" alt="Preview">
                <div class="preview-actions">
                  <button type="button" id="confirmUploadBtn" class="btn btn-primary">Confirm Upload</button>
                  <button type="button" id="cancelUploadBtn" class="btn btn-outline">Cancel</button>
                </div>
              </div>
              <div id="uploadProgress" class="upload-progress" style="display: none;">
                <div class="progress-bar"></div>
                <p id="uploadStatus">Uploading...</p>
              </div>
            </div>

            <!-- URL Input -->
            <div id="imageSourceUrl" class="image-source-content" style="display: none;">
              <input
                type="url"
                id="imageUrl"
                class="form-input url-input"
                placeholder="https://example.com/image.jpg"
                style="margin-bottom: 8px;"
                data-url-type="imageUrl"
              >
              <small style="color: var(--color-muted); display: block; margin-bottom: 8px;">Enter a valid HTTPS image URL (JPEG, PNG, WebP)</small>
              <div style="display: flex; gap: 8px;">
                <button type="button" id="confirmUrlBtn" class="btn btn-primary">Use This URL</button>
              </div>
              <div id="urlPreview" class="image-preview hidden" style="margin-top: 12px;">
                <img id="urlPreviewImage" alt="Preview">
                <div class="preview-actions">
                  <button type="button" id="confirmUrlPreviewBtn" class="btn btn-primary">Confirm</button>
                  <button type="button" id="cancelUrlBtn" class="btn btn-outline">Cancel</button>
                </div>
              </div>
            </div>

            ${board.image?.url ? `
              <div style="margin-top: 12px; padding: 8px; background-color: var(--color-hover); border-radius: 4px;">
                <small style="color: var(--color-muted);">Current: ${escapeHtml(board.image.url)}</small>
              </div>
            ` : '<small style="color: var(--color-muted);">No image set yet</small>'}
          </div>
        ` : '<small style="color: var(--color-muted);">Save board first to upload images</small>'}
      </div>

      <div class="form-actions" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--color-border);">
        <button type="button" id="cancelBtn" class="btn btn-outline">取消</button>
        <button type="submit" class="btn btn-primary">
          ${isNew ? '✓ 创建开发板' : '✓ 保存修改'}
        </button>
      </div>
    </form>

    <style>
      .form-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .form-col-half { display: flex; flex-direction: column; gap: 8px; }
      .form-col-half .form-label { margin-bottom: 0; }

      .tags-input-wrapper { position: relative; }
      .tags-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ccc;
        border-top: none;
        border-radius: 0 0 4px 4px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .tags-dropdown-list { padding: 4px 0; }
      .tags-dropdown-item {
        padding: 8px 12px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tags-dropdown-item:hover { background: #f0f0f0; }
      .tags-dropdown-item.selected { background: #e3f2fd; color: #1976d2; font-weight: 500; }

      .url-input.invalid {
        border-color: #dc2626 !important;
        background-color: rgba(220, 38, 38, 0.05) !important;
      }
      .form-error.url-error {
        color: #dc2626;
        font-size: 12px;
        margin-top: 4px;
        display: block;
      }
    </style>
  `;

  return formHtml;
}

export function renderBoardCard(board) {
  return `
    <div class="board-card" data-board-id="${escapeHtml(board.id)}">
      <div class="board-card-header">
        <div>
          <div class="board-card-title">${escapeHtml(getLocalizedString(board.name) || board.id)}</div>
          <div class="board-card-id">${escapeHtml(board.id)}</div>
        </div>
        ${board.platformId ? `<span class="board-card-platform">${escapeHtml(board.platformId)}</span>` : ''}
      </div>
      ${board.summary ? `<p class="board-card-summary">${escapeHtml(getLocalizedString(board.summary))}</p>` : ''}
      <div class="board-card-footer">
        <button class="btn btn-sm btn-outline edit-btn" data-board-id="${escapeHtml(board.id)}">
          ✏️ Edit
        </button>
        <button class="btn btn-sm btn-danger delete-btn" data-board-id="${escapeHtml(board.id)}">
          🗑️ Delete
        </button>
      </div>
    </div>
  `;
}

export async function saveBoardForm(formElement) {
  const boardId = document.getElementById('boardId')?.value;
  const nameEn = document.getElementById('boardName')?.value;
  const nameZh = document.getElementById('boardNameZh')?.value;
  const platformId = document.getElementById('platformId')?.value;
  const manufacturer = document.getElementById('manufacturer')?.value;
  const brand = document.getElementById('brand')?.value;
  const summaryEn = document.getElementById('boardSummary')?.value;
  const summaryZh = document.getElementById('boardSummaryZh')?.value;
  const tagsStr = document.getElementById('tags')?.value;
  const schematicLink = document.getElementById('schematicLink')?.value;
  const guideDocsEn = document.getElementById('guideDocs')?.value;
  const guideDocsZh = document.getElementById('guideDocsZh')?.value;
  const purchaseLinkEn = document.getElementById('purchaseLink')?.value;
  const purchaseLinkZh = document.getElementById('purchaseLinkZh')?.value;

  // Validate required fields
  if (!boardId || !nameEn || !platformId) {
    showError('Validation Error', 'Please fill in all required fields');
    return false;
  }

  // Validate all URL fields
  const urlFields = {
    'Schematic Link': { url: schematicLink, id: 'schematicLink' },
    'Guide Docs (EN)': { url: guideDocsEn, id: 'guideDocs' },
    'Guide Docs (ZH)': { url: guideDocsZh, id: 'guideDocsZh' },
    'Purchase Link (EN)': { url: purchaseLinkEn, id: 'purchaseLink' },
    'Purchase Link (ZH)': { url: purchaseLinkZh, id: 'purchaseLinkZh' },
  };

  for (const [fieldName, { url }] of Object.entries(urlFields)) {
    if (url && !validateHttpsUrl(url)) {
      showError('Invalid URL', `${fieldName} must be a valid HTTPS URL`);
      return false;
    }
  }

  // Validate tags format
  const tagsSelect = document.getElementById('tags');
  const tags = Array.from(tagsSelect?.selectedOptions || []).map(opt => opt.value);

  if (tags.length === 0) {
    showError('Validation Error', 'Please select at least one tag');
    return false;
  }

  const boardData = {
    id: boardId,
    name: { en: nameEn },
    platformId,
    manufacturer: manufacturer || { en: 'Unknown' },
    brand: brand || { en: 'Ecosystem' },
    summary: { en: summaryEn },
    tags,
    autoCommit: true,
  };

  if (nameZh) {
    boardData.name['zh-CN'] = nameZh;
  }

  if (summaryZh) {
    boardData.summary['zh-CN'] = summaryZh;
  }

  // Add optional links
  if (schematicLink) {
    boardData.schematicLink = schematicLink;
  }

  if (guideDocsEn || guideDocsZh) {
    boardData.guideDocs = { en: guideDocsEn };
    if (guideDocsZh) {
      boardData.guideDocs['zh-CN'] = guideDocsZh;
    }
  }

  if (purchaseLinkEn || purchaseLinkZh) {
    boardData.purchaseLink = { en: purchaseLinkEn };
    if (purchaseLinkZh) {
      boardData.purchaseLink['zh-CN'] = purchaseLinkZh;
    }
  }

  try {
    let result;
    const isNew = !formElement.dataset.isEdit;

    if (isNew) {
      result = await apiClient.createBoard(boardData);
    } else {
      result = await apiClient.updateBoard(boardId, boardData);
    }

    if (result.success) {
      showNotification(`Board "${boardId}" ${isNew ? 'created' : 'updated'} successfully`);
      return true;
    }
  } catch (error) {
    showError('Save Failed', error.message);
    return false;
  }
}

function isValidTagFormat(tag) {
  return /^[a-z0-9-]+$/.test(tag);
}

export function setupFormValidation() {
  // Real-time HTTPS URL validation
  document.querySelectorAll('.url-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      const urlType = e.target.dataset.urlType;
      const errorEl = document.getElementById(urlType + 'Error');

      if (url && !validateHttpsUrl(url)) {
        e.target.classList.add('invalid');
        if (errorEl) {
          errorEl.textContent = '❌ Must be a valid HTTPS URL (https://...)';
          errorEl.classList.add('url-error');
        }
      } else {
        e.target.classList.remove('invalid');
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.classList.remove('url-error');
        }
      }
    });

    // Initial check
    const url = input.value.trim();
    if (url && !validateHttpsUrl(url)) {
      input.classList.add('invalid');
      const errorEl = document.getElementById(input.dataset.urlType + 'Error');
      if (errorEl) {
        errorEl.textContent = '❌ Must be a valid HTTPS URL (https://...)';
        errorEl.classList.add('url-error');
      }
    }
  });

  // Populate tags multi-select dropdown
  const tagsSelect = document.getElementById('tags');
  if (tagsSelect && globalTagsList.length > 0) {
    tagsSelect.innerHTML = globalTagsList.map(tag => `
      <option value="${escapeHtml(tag.id)}">${escapeHtml(tag.label)}</option>
    `).join('');

    // Pre-select existing tags from board data if editing
    const boardForm = document.getElementById('boardForm');
    if (boardForm && boardForm.dataset.isEdit === 'true') {
      const boardId = document.getElementById('boardId')?.value;
      // Tags should be pre-selected by the form rendering logic
    }
  }
}


export async function deleteBoardPrompt(boardId) {
  // First confirmation
  if (!confirm(`⚠️ WARNING: Delete board "${boardId}"?\n\nThis action CANNOT be undone!`)) {
    return false;
  }

  // Second confirmation with explicit requirement
  const confirmText = prompt(
    `🔴 FINAL CONFIRMATION\n\nType the board ID to confirm deletion:\n\n"${boardId}"\n\n(This cannot be undone!)`,
    ''
  );

  if (confirmText !== boardId) {
    if (confirmText !== null) {
      showError('Confirmation Failed', `You entered "${confirmText}". Please enter exactly "${boardId}" to confirm.`);
    }
    return false;
  }

  try {
    const result = await apiClient.deleteBoard(boardId, true);
    if (result.success) {
      showNotification(`✅ Board "${boardId}" has been permanently deleted`);
      return true;
    }
  } catch (error) {
    showError('Delete Failed', error.message);
    return false;
  }
}
