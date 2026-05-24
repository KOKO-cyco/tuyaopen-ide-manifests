// Demo Editor Module — card rendering, form, save/delete logic

import { apiClient } from './api-client.js';
import { showNotification, showError, escapeHtml } from './utils.js';
import i18n from './i18n.js';

// ========== Card Rendering ==========

export function renderDemoCard(demo) {
  const nameEn = typeof demo.name === 'object' ? (demo.name.en || demo.name['zh-CN'] || demo.id) : (demo.name || demo.id);
  const summaryEn = typeof demo.summary === 'object' ? (demo.summary.en || demo.summary['zh-CN'] || '') : '';
  const truncatedSummary = summaryEn.length > 120 ? summaryEn.slice(0, 117) + '...' : summaryEn;

  const isApp = demo.tags?.includes('app');
  const categoryLabel = isApp ? 'App' : 'Example';
  const categoryClass = isApp ? 'demo-badge-app' : 'demo-badge-example';

  const compatLabel = demo.compatibilityType === 'universal' ? i18n.t('demoUniversal') : `${demo.boards?.length || 0} boards`;
  const compatClass = demo.compatibilityType === 'universal' ? 'demo-badge-universal' : 'demo-badge-boards';

  const isPublished = demo.publish !== false;
  const publishBadge = isPublished
    ? '<span class="demo-badge demo-badge-published">Published</span>'
    : '<span class="demo-badge demo-badge-unpublished">Unpublished</span>';

  const tagsHtml = (demo.tags || [])
    .filter(t => t !== 'app' && t !== 'example')
    .slice(0, 5)
    .map(t => `<span class="demo-tag">${escapeHtml(t)}</span>`)
    .join('');

  const sourceLink = demo.source?.subpath || '';

  return `
    <div class="demo-card${!isPublished ? ' demo-card-unpublished' : ''}" data-demo-id="${escapeHtml(demo.id)}">
      <div class="demo-card-header">
        <h3 class="demo-card-title">${escapeHtml(nameEn)}</h3>
        <div class="demo-card-badges">
          ${publishBadge}
          <span class="demo-badge ${categoryClass}">${categoryLabel}</span>
          <span class="demo-badge ${compatClass}">${compatLabel}</span>
        </div>
      </div>
      ${truncatedSummary ? `<p class="demo-card-summary">${escapeHtml(truncatedSummary)}</p>` : ''}
      <div class="demo-card-meta">
        <div class="demo-tags">${tagsHtml}</div>
        <div class="demo-card-source" title="${escapeHtml(sourceLink)}">📁 ${escapeHtml(sourceLink)}</div>
      </div>
      <div class="demo-card-actions">
        <button class="btn btn-sm btn-outline demo-edit-btn" data-demo-id="${escapeHtml(demo.id)}" data-i18n="demoEdit">Edit</button>
        <button class="btn btn-sm btn-danger demo-delete-btn" data-demo-id="${escapeHtml(demo.id)}" data-i18n="demoDelete">Delete</button>
      </div>
    </div>
  `;
}

// ========== Form Rendering ==========

export function renderDemoForm(demo = null) {
  const isEdit = !!demo;
  const d = demo || {};
  const nameEn = typeof d.name === 'object' ? (d.name?.en || '') : '';
  const nameZh = typeof d.name === 'object' ? (d.name?.['zh-CN'] || '') : '';
  const summaryEn = typeof d.summary === 'object' ? (d.summary?.en || '') : '';
  const summaryZh = typeof d.summary === 'object' ? (d.summary?.['zh-CN'] || '') : '';
  const tags = (d.tags || []).filter(t => t !== 'app' && t !== 'example').join(', ');
  const boards = (d.boards || []).join(', ');
  const isUniversal = d.compatibilityType === 'universal';
  const isPublished = d.publish !== false;
  const sourceRepo = d.source?.repo || 'https://github.com/tuya/TuyaOpen';
  const sourceSubpath = d.source?.subpath || '';
  const sourceRef = d.source?.ref || 'master';
  const defaultConfig = d.defaultConfig ? JSON.stringify(d.defaultConfig, null, 2) : '';
  const readmeEn = d.documentation?.readme?.en || '';
  const readmeZh = d.documentation?.readme?.['zh-CN'] || '';

  return `
    <form id="demoForm" class="demo-form">
      <div class="form-group">
        <label class="form-label" data-i18n="demoId">ID</label>
        <input type="text" id="demoId" class="form-input" value="${escapeHtml(d.id || '')}"
          ${isEdit ? 'readonly' : ''} placeholder="my-demo-name" pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" required>
        ${!isEdit ? '<small class="form-hint">Kebab-case: lowercase letters, numbers, hyphens only</small>' : ''}
      </div>

      <div class="form-group">
        <label class="form-label">Publish</label>
        <label class="form-toggle">
          <input type="checkbox" id="demoPublish" ${isPublished ? 'checked' : ''}>
          <span class="form-toggle-label">${isPublished ? 'Published — visible in IDE' : 'Unpublished — hidden in IDE'}</span>
        </label>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" data-i18n="demoNameEn">Name (EN)</label>
          <input type="text" id="demoNameEn" class="form-input" value="${escapeHtml(nameEn)}" required>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="demoNameZh">Name (zh-CN)</label>
          <input type="text" id="demoNameZh" class="form-input" value="${escapeHtml(nameZh)}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" data-i18n="demoSummaryEn">Summary (EN)</label>
          <textarea id="demoSummaryEn" class="form-textarea" rows="3">${escapeHtml(summaryEn)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="demoSummaryZh">Summary (zh-CN)</label>
          <textarea id="demoSummaryZh" class="form-textarea" rows="3">${escapeHtml(summaryZh)}</textarea>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" data-i18n="demoTags">Tags (comma separated)</label>
        <input type="text" id="demoTags" class="form-input" value="${escapeHtml(tags)}" placeholder="wifi, ai, peripheral">
      </div>

      <div class="form-group">
        <label class="form-label" data-i18n="demoCompatibility">Compatibility</label>
        <div class="form-radio-group">
          <label class="form-radio">
            <input type="radio" name="compatibilityType" value="universal" ${isUniversal ? 'checked' : ''}>
            <span data-i18n="demoUniversal">Universal (cross-platform)</span>
          </label>
          <label class="form-radio">
            <input type="radio" name="compatibilityType" value="board-specific" ${!isUniversal ? 'checked' : ''}>
            <span data-i18n="demoBoardSpecific">Board-specific</span>
          </label>
        </div>
      </div>

      <div class="form-group" id="demoBoardsGroup" style="${isUniversal ? 'display:none' : ''}">
        <label class="form-label" data-i18n="demoBoardsList">Boards (comma separated)</label>
        <input type="text" id="demoBoards" class="form-input" value="${escapeHtml(boards)}" placeholder="tuya-t5ai-evb, tuya-t5ai-board">
      </div>

      <fieldset class="form-fieldset">
        <legend data-i18n="demoConfigs">Board Configs</legend>
        <small class="form-hint" style="display: block; margin-bottom: 12px;" data-i18n="demoConfigsHint">Map kconfigId to config file path</small>
        <div id="configsRows">
          ${d.configs ? Object.entries(d.configs).map(([key, val], idx) => `
            <div class="configs-row" data-row-idx="${idx}">
              <input type="text" class="form-input configs-key" value="${escapeHtml(key)}" placeholder="TUYA_T5AI_EVB" pattern="^[A-Z0-9][A-Z0-9_.]*$" data-i18n-placeholder="demoConfigsKconfigId">
              <input type="text" class="form-input configs-value" value="${escapeHtml(val)}" placeholder="config/TUYA_T5AI_EVB.config" data-i18n-placeholder="demoConfigsFile">
              <button type="button" class="btn btn-sm btn-danger btn-remove configs-remove-btn">✕</button>
            </div>
          `).join('') : ''}
        </div>
        <button type="button" class="btn btn-sm btn-outline" id="addConfigRowBtn" data-i18n="demoConfigsAdd">+ Add Config</button>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend data-i18n="demoSource">Source</legend>
        <div class="form-group">
          <label class="form-label" data-i18n="demoSourceRepo">Repository URL</label>
          <input type="url" id="demoSourceRepo" class="form-input" value="${escapeHtml(sourceRepo)}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" data-i18n="demoSourceSubpath">Subpath</label>
            <input type="text" id="demoSourceSubpath" class="form-input" value="${escapeHtml(sourceSubpath)}" required placeholder="apps/my_app">
          </div>
          <div class="form-group">
            <label class="form-label" data-i18n="demoSourceRef">Branch/Ref</label>
            <input type="text" id="demoSourceRef" class="form-input" value="${escapeHtml(sourceRef)}">
          </div>
        </div>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend data-i18n="demoDocumentation">Documentation</legend>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">README (EN)</label>
            <input type="url" id="demoReadmeEn" class="form-input" value="${escapeHtml(readmeEn)}" placeholder="https://github.com/...">
          </div>
          <div class="form-group">
            <label class="form-label">README (zh-CN)</label>
            <input type="url" id="demoReadmeZh" class="form-input" value="${escapeHtml(readmeZh)}" placeholder="https://github.com/...">
          </div>
        </div>
      </fieldset>

      <div class="form-group">
        <label class="form-label" data-i18n="demoDefaultConfig">Default Config (JSON)</label>
        <textarea id="demoDefaultConfig" class="form-textarea form-monospace" rows="5" placeholder='{}'>${escapeHtml(defaultConfig)}</textarea>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-outline" id="demoCancelBtn" data-i18n="cancelBtn">Cancel</button>
        <button type="submit" class="btn btn-primary" data-i18n="demoSave">${isEdit ? 'Save Changes' : 'Create Demo'}</button>
      </div>
    </form>
  `;
}

// ========== Save Logic ==========

export async function saveDemoForm(form, demoId = null) {
  const id = demoId || document.getElementById('demoId').value.trim();
  const isEdit = !!demoId;

  const compatType = form.querySelector('input[name="compatibilityType"]:checked')?.value || 'universal';
  const tagsRaw = document.getElementById('demoTags').value.trim();
  const boardsRaw = document.getElementById('demoBoards').value.trim();
  const categoryTag = compatType === 'universal' ? 'example' : 'app';

  let tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  if (!tags.includes(categoryTag)) tags.unshift(categoryTag);

  const boards = compatType === 'universal' ? [] : (boardsRaw ? boardsRaw.split(',').map(b => b.trim()).filter(Boolean) : []);

  let defaultConfig = {};
  const configText = document.getElementById('demoDefaultConfig').value.trim();
  if (configText) {
    try {
      defaultConfig = JSON.parse(configText);
    } catch {
      showError('Invalid JSON', 'Default Config must be valid JSON');
      return false;
    }
  }

  // Collect configs map from dynamic rows
  const configs = {};
  const configRows = document.querySelectorAll('#configsRows .configs-row');
  configRows.forEach(row => {
    const key = row.querySelector('.configs-key')?.value?.trim();
    const val = row.querySelector('.configs-value')?.value?.trim();
    if (key && val) {
      configs[key] = val;
    }
  });

  const data = {
    id,
    publish: document.getElementById('demoPublish').checked,
    name: {
      en: document.getElementById('demoNameEn').value.trim(),
      'zh-CN': document.getElementById('demoNameZh').value.trim(),
    },
    summary: {
      en: document.getElementById('demoSummaryEn').value.trim(),
      'zh-CN': document.getElementById('demoSummaryZh').value.trim(),
    },
    tags,
    boards,
    compatibilityType: compatType,
    source: {
      repo: document.getElementById('demoSourceRepo').value.trim(),
      subpath: document.getElementById('demoSourceSubpath').value.trim(),
      ref: document.getElementById('demoSourceRef').value.trim() || 'master',
    },
    defaultConfig,
    configs: Object.keys(configs).length > 0 ? configs : undefined,
    documentation: {
      readme: {
        en: document.getElementById('demoReadmeEn').value.trim() || null,
        'zh-CN': document.getElementById('demoReadmeZh').value.trim() || null,
      },
    },
  };

  try {
    if (isEdit) {
      await apiClient.updateDemo(id, data);
      showNotification(i18n.t('demoUpdated') || `Demo "${id}" updated`);
    } else {
      await apiClient.createDemo(data);
      showNotification(i18n.t('demoCreated') || `Demo "${id}" created`);
    }
    return true;
  } catch (error) {
    showError('Save Failed', error.message);
    return false;
  }
}

// ========== Delete Logic ==========

export async function deleteDemoAction(demoId) {
  const msg = (i18n.t('demoDeleteConfirm') || 'Delete demo "{id}"?').replace('{id}', demoId);
  if (!confirm(msg)) return false;

  try {
    await apiClient.deleteDemo(demoId);
    showNotification(i18n.t('demoDeleted') || `Demo "${demoId}" deleted`);
    return true;
  } catch (error) {
    showError('Delete Failed', error.message);
    return false;
  }
}
