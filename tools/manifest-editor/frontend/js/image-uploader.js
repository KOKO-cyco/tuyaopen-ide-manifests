// Image Uploader module

import { apiClient } from './api-client.js';
import { showNotification, showError } from './utils.js';

let selectedFile = null;
let currentBoardId = null;

export function initImageUploader() {
  const modal = document.getElementById('imageUploadModal');
  const zone = document.getElementById('imageUploadZone');
  const input = document.getElementById('imageInput');
  const closeBtn = document.getElementById('closeImageModalBtn');
  const confirmBtn = document.getElementById('confirmUploadBtn');
  const cancelBtn = document.getElementById('cancelUploadBtn');

  if (!modal || !zone) return;

  // Drag and drop
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--color-primary)';
  });

  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = 'var(--color-border)';
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--color-border)';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  });

  // Click to select
  zone.addEventListener('click', () => {
    input.click();
  });

  input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Buttons
  closeBtn.addEventListener('click', () => closeImageUploadModal());
  cancelBtn.addEventListener('click', () => closeImageUploadModal());
  confirmBtn.addEventListener('click', () => uploadImage());
}

function handleFileSelect(file) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showError('Invalid File', 'Please select an image file (JPEG, PNG, WebP)');
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5242880) {
    showError('File Too Large', 'Maximum file size is 5MB');
    return;
  }

  selectedFile = file;
  showFilePreview(file);
}

function showFilePreview(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const preview = document.getElementById('previewImage');
    const previewContainer = document.getElementById('imagePreview');
    const uploadZone = document.getElementById('imageUploadZone');

    preview.src = e.target.result;
    previewContainer.classList.remove('hidden');
    uploadZone.style.display = 'none';
  };

  reader.readAsDataURL(file);
}

async function uploadImage() {
  if (!selectedFile || !currentBoardId) {
    showError('Error', 'No file or board selected');
    return;
  }

  const filename = `board-${Date.now()}.jpg`;
  const progressDiv = document.getElementById('uploadProgress');
  const statusText = document.getElementById('uploadStatus');
  const uploadZone = document.getElementById('imageUploadZone');
  const confirmBtn = document.getElementById('confirmUploadBtn');

  try {
    progressDiv.classList.remove('hidden');
    uploadZone.style.display = 'none';
    confirmBtn.disabled = true;

    const result = await apiClient.uploadImage(
      currentBoardId,
      selectedFile,
      filename,
      true
    );

    if (result.success) {
      showNotification(`Image uploaded successfully: ${result.image.url}`);
      closeImageUploadModal();

      // Trigger refresh of board to show new image
      const event = new CustomEvent('imageUploaded', {
        detail: { boardId: currentBoardId, imageUrl: result.image.url },
      });
      window.dispatchEvent(event);
    }
  } catch (error) {
    showError('Upload Failed', error.message);
  } finally {
    progressDiv.classList.add('hidden');
    confirmBtn.disabled = false;
  }
}

export function openImageUploadModal(boardId) {
  currentBoardId = boardId;
  selectedFile = null;

  const modal = document.getElementById('imageUploadModal');
  const uploadZone = document.getElementById('imageUploadZone');
  const previewContainer = document.getElementById('imagePreview');
  const input = document.getElementById('imageInput');

  // Reset form
  uploadZone.style.display = 'block';
  previewContainer.classList.add('hidden');
  input.value = '';

  modal.classList.remove('hidden');
}

export function closeImageUploadModal() {
  const modal = document.getElementById('imageUploadModal');
  modal.classList.add('hidden');
  selectedFile = null;
  currentBoardId = null;
}

export function setupInlineUpload(boardId) {
  // Find the container with this board ID
  const container = document.querySelector(`.image-upload-inline [data-board-id="${boardId}"]`)?.closest('.image-upload-inline');

  if (!container) return;

  const zone = container.querySelector('.image-upload-zone');
  const input = container.querySelector('input[type="file"]');
  const confirmBtn = container.querySelector('#confirmUploadBtn');
  const cancelBtn = container.querySelector('#cancelUploadBtn');

  // URL source elements
  const imageUrlInput = container.querySelector('#imageUrl');
  const confirmUrlBtn = container.querySelector('#confirmUrlBtn');
  const confirmUrlPreviewBtn = container.querySelector('#confirmUrlPreviewBtn');
  const cancelUrlBtn = container.querySelector('#cancelUrlBtn');
  const urlPreview = container.querySelector('#urlPreview');
  const urlPreviewImage = container.querySelector('#urlPreviewImage');
  const sourceFileTabs = container.querySelectorAll('.image-source-tab');
  const imageSourceFile = container.querySelector('#imageSourceFile');
  const imageSourceUrl = container.querySelector('#imageSourceUrl');

  if (!zone || !input) {
    console.error('Image upload elements not found for board:', boardId);
    return;
  }

  const uploadContext = { boardId, selectedFile: null, selectedUrl: null, container };

  // Tab switching
  sourceFileTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const source = tab.dataset.source;

      // Update active tab style
      sourceFileTabs.forEach(t => {
        if (t.dataset.source === source) {
          t.style.color = 'var(--color-primary)';
          t.style.fontWeight = '600';
          t.style.borderBottom = '2px solid var(--color-primary)';
        } else {
          t.style.color = 'var(--color-muted)';
          t.style.fontWeight = '500';
          t.style.borderBottom = 'none';
        }
      });

      // Toggle content visibility
      if (source === 'file') {
        imageSourceFile.style.display = 'block';
        imageSourceUrl.style.display = 'none';
      } else {
        imageSourceFile.style.display = 'none';
        imageSourceUrl.style.display = 'block';
      }
    });
  });

  // Drag and drop
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--color-primary)';
  });

  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = 'var(--color-border)';
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--color-border)';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleInlineFileSelect(files[0], uploadContext, zone, input);
    }
  });

  // Click to select
  zone.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (input && typeof input.click === 'function') {
      input.click();
    }
  });

  input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleInlineFileSelect(e.target.files[0], uploadContext, zone, input);
    }
  });

  // Buttons
  if (confirmBtn) {
    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      uploadInlineImage(uploadContext, zone, input);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      cancelInlineUpload(uploadContext, zone);
    });
  }

  // URL input handlers
  if (confirmUrlBtn) {
    confirmUrlBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = imageUrlInput.value;

      if (!url) {
        showError('Missing URL', 'Please enter an image URL');
        return;
      }

      if (!url.startsWith('https://')) {
        showError('Invalid URL', 'URL must use HTTPS protocol');
        return;
      }

      // Validate it's an image
      const validImageFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      const urlLower = url.toLowerCase();
      const isValidImage = validImageFormats.some(fmt => urlLower.includes(`.${fmt}`));

      if (!isValidImage) {
        showError('Invalid Image', 'URL must point to a valid image file (JPEG, PNG, WebP, GIF)');
        return;
      }

      // Try to load the image
      const img = new Image();
      img.onload = () => {
        uploadContext.selectedUrl = url;
        const urlPreviewImg = container.querySelector('#urlPreviewImage');
        const urlPreviewDiv = container.querySelector('#urlPreview');
        urlPreviewImg.src = url;
        urlPreviewDiv.style.display = 'block';
        imageUrlInput.style.display = 'none';
        confirmUrlBtn.style.display = 'none';
      };
      img.onerror = () => {
        showError('Cannot Load Image', 'Failed to load image from URL. Make sure it\'s a valid HTTPS image URL.');
      };
      img.src = url;
    });
  }

  if (confirmUrlPreviewBtn) {
    confirmUrlPreviewBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (uploadContext.selectedUrl) {
        await uploadUrlImage(uploadContext, imageSourceUrl);
      }
    });
  }

  if (cancelUrlBtn) {
    cancelUrlBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const urlPreview = container.querySelector('#urlPreview');
      imageUrlInput.value = '';
      imageUrlInput.style.display = 'block';
      confirmUrlBtn.style.display = 'block';
      urlPreview.style.display = 'none';
      uploadContext.selectedUrl = null;
    });
  }
}

function handleInlineFileSelect(file, context, zone, input) {
  if (!file.type.startsWith('image/')) {
    showError('Invalid File', 'Please select an image file (JPEG, PNG, WebP)');
    return;
  }

  if (file.size > 5242880) {
    showError('File Too Large', 'Maximum file size is 5MB');
    return;
  }

  context.selectedFile = file;
  showInlineFilePreview(file, zone);
}

function showInlineFilePreview(file, zone) {
  const reader = new FileReader();
  const container = zone.closest('.image-upload-inline');
  const preview = container.querySelector('#imagePreview');
  const previewImg = container.querySelector('#previewImage');

  reader.onload = (e) => {
    previewImg.src = e.target.result;
    preview.style.display = 'block';
    zone.style.display = 'none';
  };

  reader.readAsDataURL(file);
}

async function uploadInlineImage(context, zone, input) {
  if (!context.selectedFile || !context.boardId) {
    showError('Error', 'No file or board selected');
    return;
  }

  const container = zone.closest('.image-upload-inline');
  const preview = container.querySelector('#imagePreview');
  const confirmBtn = container.querySelector('#confirmUploadBtn');
  const progress = container.querySelector('#uploadProgress');

  try {
    progress.style.display = 'block';
    confirmBtn.disabled = true;

    const filename = `board-${Date.now()}.jpg`;
    const result = await apiClient.uploadImage(context.boardId, context.selectedFile, filename, true);

    if (result.success) {
      showNotification(`Image uploaded successfully`);
      cancelInlineUpload(context, zone);

      // Trigger refresh of board to show new image
      const event = new CustomEvent('imageUploaded', {
        detail: { boardId: context.boardId, imageUrl: result.image.url },
      });
      window.dispatchEvent(event);
    }
  } catch (error) {
    showError('Upload Failed', error.message);
  } finally {
    progress.style.display = 'none';
    confirmBtn.disabled = false;
  }
}

function cancelInlineUpload(context, zone) {
  const container = zone.closest('.image-upload-inline');
  const preview = container.querySelector('#imagePreview');
  const input = container.querySelector('input[type="file"]');

  zone.style.display = 'block';
  preview.style.display = 'none';
  input.value = '';
  context.selectedFile = null;
}

async function uploadUrlImage(context, sourceContainer) {
  if (!context.selectedUrl || !context.boardId) {
    showError('Error', 'No URL or board selected');
    return;
  }

  const confirmBtn = sourceContainer.querySelector('#confirmUrlPreviewBtn');

  try {
    confirmBtn.disabled = true;

    const result = await apiClient.uploadImage(
      context.boardId,
      context.selectedUrl,
      null,
      true,
      true // isUrl flag
    );

    if (result.success) {
      showNotification(`Image set successfully from URL`);

      // Reset UI
      const imageUrlInput = sourceContainer.querySelector('#imageUrl');
      const confirmUrlBtn = sourceContainer.querySelector('#confirmUrlBtn');
      const urlPreview = sourceContainer.querySelector('#urlPreview');
      imageUrlInput.value = '';
      imageUrlInput.style.display = 'block';
      confirmUrlBtn.style.display = 'block';
      urlPreview.style.display = 'none';
      context.selectedUrl = null;

      // Trigger refresh
      const event = new CustomEvent('imageUploaded', {
        detail: { boardId: context.boardId, imageUrl: result.image.url },
      });
      window.dispatchEvent(event);
    }
  } catch (error) {
    showError('Upload Failed', error.message);
  } finally {
    confirmBtn.disabled = false;
  }
}

// Export for initialization
export default {
  init: initImageUploader,
  open: openImageUploadModal,
  close: closeImageUploadModal,
  setupInlineUpload: setupInlineUpload,
};
