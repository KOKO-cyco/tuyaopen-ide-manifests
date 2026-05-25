// Image Uploader module — with min-size validation, cropping, and compression

import { apiClient } from './api-client.js';
import { showNotification, showError } from './utils.js';

const IMAGE_SPECS = {
  board: { width: 500, height: 500, aspectRatio: 1, label: '500×500 (1:1 square)' },
  demo: { width: 960, height: 540, aspectRatio: 16 / 9, label: '960×540 (16:9)' },
};
const MIN_DIMENSION = 500;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

let selectedFile = null;
let currentBoardId = null;
let activeCropper = null;

// --- Cropper Modal ---

function createCropperModal() {
  if (document.getElementById('cropperModal')) return;

  const modal = document.createElement('div');
  modal.id = 'cropperModal';
  modal.className = 'image-crop-dialog hidden';
  modal.innerHTML = `
    <div class="image-crop-backdrop"></div>
    <div class="image-crop-content">
      <div class="image-crop-header">
        <h3>Crop Image</h3>
        <span class="image-crop-recommendation"></span>
      </div>
      <div class="image-crop-body">
        <div class="image-crop-canvas">
          <img id="cropperImage" alt="Crop preview">
        </div>
      </div>
      <div class="image-crop-footer">
        <label class="image-crop-fit-toggle" title="Fit entire image with white padding instead of cropping">
          <input type="checkbox" id="cropperFitMode">
          <span>Fit (white padding)</span>
        </label>
        <button type="button" id="cropperCancelBtn" class="btn btn-outline">Cancel</button>
        <button type="button" id="cropperConfirmBtn" class="btn btn-primary">Crop & Upload</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.image-crop-backdrop').addEventListener('click', closeCropperModal);
  modal.querySelector('#cropperCancelBtn').addEventListener('click', closeCropperModal);
}

function closeCropperModal() {
  const modal = document.getElementById('cropperModal');
  if (modal) modal.classList.add('hidden');
  if (activeCropper) {
    activeCropper.destroy();
    activeCropper = null;
  }
}

function openCropperModal(imageSrc, imageType, onConfirm) {
  createCropperModal();
  const modal = document.getElementById('cropperModal');
  const img = modal.querySelector('#cropperImage');
  const recommendation = modal.querySelector('.image-crop-recommendation');
  const spec = IMAGE_SPECS[imageType] || IMAGE_SPECS.board;

  recommendation.textContent = `Recommended: ${spec.label}. Must be at least ${MIN_DIMENSION}px.`;

  img.src = imageSrc;
  modal.classList.remove('hidden');

  if (activeCropper) {
    activeCropper.destroy();
    activeCropper = null;
  }

  // Wait for image to load before initializing cropper
  img.onload = () => {
    activeCropper = new Cropper(img, {
      aspectRatio: spec.aspectRatio,
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
      background: true,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    });
  };

  // Set up confirm handler
  const confirmBtn = modal.querySelector('#cropperConfirmBtn');
  const fitCheckbox = modal.querySelector('#cropperFitMode');
  fitCheckbox.checked = false;
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  newConfirmBtn.addEventListener('click', async () => {
    if (!activeCropper) return;
    newConfirmBtn.disabled = true;
    newConfirmBtn.textContent = 'Processing...';
    try {
      let blob;
      if (fitCheckbox.checked) {
        blob = await fitImageOnWhiteCanvas(img.src, spec);
      } else {
        const canvas = activeCropper.getCroppedCanvas({
          width: spec.width,
          height: spec.height,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
        });
        blob = await compressToTarget(canvas, MAX_FILE_SIZE);
      }
      closeCropperModal();
      onConfirm(blob);
    } catch (err) {
      showError('Crop Failed', err.message);
    } finally {
      newConfirmBtn.disabled = false;
      newConfirmBtn.textContent = 'Crop & Upload';
    }
  });
}

// --- Compression ---

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas to blob failed'))),
      type,
      quality
    );
  });
}

async function compressToTarget(canvas, maxBytes) {
  let quality = 0.85;
  let blob;
  do {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    quality -= 0.05;
  } while (blob.size > maxBytes && quality > 0.3);
  return blob;
}

async function fitImageOnWhiteCanvas(imageSrc, spec) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = spec.width;
      canvas.height = spec.height;
      const ctx = canvas.getContext('2d');

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, spec.width, spec.height);

      // Scale image to fit within target, preserving aspect ratio
      const scale = Math.min(spec.width / img.naturalWidth, spec.height / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const offsetX = (spec.width - drawW) / 2;
      const offsetY = (spec.height - drawH) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

      try {
        const blob = await compressToTarget(canvas, MAX_FILE_SIZE);
        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for fit mode'));
    img.src = imageSrc;
  });
}

// --- Dimension Validation ---

function validateImageDimensions(img) {
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  if (minSide < MIN_DIMENSION) {
    showError(
      'Image Too Small',
      `Minimum dimension is ${MIN_DIMENSION}px. This image is ${img.naturalWidth}×${img.naturalHeight}px.`
    );
    return false;
  }
  return true;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve({ img, dataUrl: e.target.result });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// --- Modal Uploader (legacy path) ---

export function initImageUploader() {
  const modal = document.getElementById('imageUploadModal');
  const zone = document.getElementById('imageUploadZone');
  const input = document.getElementById('imageInput');
  const closeBtn = document.getElementById('closeImageModalBtn');
  const confirmBtn = document.getElementById('confirmUploadBtn');
  const cancelBtn = document.getElementById('cancelUploadBtn');

  if (!modal || !zone) return;

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

  zone.addEventListener('click', () => {
    input.click();
  });

  input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  closeBtn.addEventListener('click', () => closeImageUploadModal());
  cancelBtn.addEventListener('click', () => closeImageUploadModal());
  confirmBtn.addEventListener('click', () => uploadImage());
}

async function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    showError('Invalid File', 'Please select an image file (JPEG, PNG, WebP)');
    return;
  }

  if (file.size > 5242880) {
    showError('File Too Large', 'Maximum file size is 5MB');
    return;
  }

  try {
    const { img, dataUrl } = await loadImageFromFile(file);
    if (!validateImageDimensions(img)) return;

    selectedFile = file;
    showFilePreview(dataUrl);
  } catch (err) {
    showError('Error', err.message);
  }
}

function showFilePreview(dataUrl) {
  const preview = document.getElementById('previewImage');
  const previewContainer = document.getElementById('imagePreview');
  const uploadZone = document.getElementById('imageUploadZone');

  preview.src = dataUrl;
  previewContainer.classList.remove('hidden');
  uploadZone.style.display = 'none';
}

async function uploadImage() {
  if (!selectedFile || !currentBoardId) {
    showError('Error', 'No file or board selected');
    return;
  }

  const filename = `${currentBoardId}.jpg`;
  const progressDiv = document.getElementById('uploadProgress');
  const uploadZone = document.getElementById('imageUploadZone');
  const confirmBtn = document.getElementById('confirmUploadBtn');

  try {
    progressDiv.classList.remove('hidden');
    uploadZone.style.display = 'none';
    confirmBtn.disabled = true;

    const result = await apiClient.uploadImage(currentBoardId, selectedFile, filename, true);

    if (result.success) {
      showNotification(`Image uploaded successfully: ${result.image.url}`);
      closeImageUploadModal();

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

// --- Inline Uploader (board-editor integration with cropper) ---

export function setupInlineUpload(boardId, imageType = 'board') {
  const container = document.querySelector(`.image-upload-inline [data-board-id="${boardId}"]`)?.closest('.image-upload-inline');

  if (!container) return;

  const zone = container.querySelector('.image-upload-zone');
  const input = container.querySelector('input[type="file"]');

  const imageUrlInput = container.querySelector('#imageUrl');
  const confirmUrlBtn = container.querySelector('#confirmUrlBtn');
  const confirmUrlPreviewBtn = container.querySelector('#confirmUrlPreviewBtn');
  const cancelUrlBtn = container.querySelector('#cancelUrlBtn');
  const sourceFileTabs = container.querySelectorAll('.image-source-tab');
  const imageSourceFile = container.querySelector('#imageSourceFile');
  const imageSourceUrl = container.querySelector('#imageSourceUrl');

  if (!zone || !input) {
    console.error('Image upload elements not found for board:', boardId);
    return;
  }

  const uploadContext = { boardId, selectedFile: null, selectedUrl: null, container, imageType };

  // Inject recommendation text
  injectRecommendationText(zone, imageType);

  // Tab switching
  sourceFileTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const source = tab.dataset.source;

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
      handleInlineFileSelect(files[0], uploadContext, zone);
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
      handleInlineFileSelect(e.target.files[0], uploadContext, zone);
    }
  });

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

      const validImageFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      const urlLower = url.toLowerCase();
      const isValidImage = validImageFormats.some(fmt => urlLower.includes(`.${fmt}`));

      if (!isValidImage) {
        showError('Invalid Image', 'URL must point to a valid image file (JPEG, PNG, WebP, GIF)');
        return;
      }

      // Validate dimensions by loading the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!validateImageDimensions(img)) return;

        // Open cropper for URL-sourced images too
        openCropperModal(url, uploadContext.imageType, async (blob) => {
          try {
            const filename = `${uploadContext.boardId}.jpg`;            const result = await apiClient.uploadImage(uploadContext.boardId, blob, filename, true);
            if (result.success) {
              showNotification('Image uploaded successfully');
              resetUrlUI(container, imageUrlInput, confirmUrlBtn, uploadContext);
              const event = new CustomEvent('imageUploaded', {
                detail: { boardId: uploadContext.boardId, imageUrl: result.image.url },
              });
              window.dispatchEvent(event);
            }
          } catch (error) {
            showError('Upload Failed', error.message);
          }
        });
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

function injectRecommendationText(zone, imageType) {
  if (zone.querySelector('.image-recommendation')) return;
  const spec = IMAGE_SPECS[imageType] || IMAGE_SPECS.board;
  const hint = document.createElement('p');
  hint.className = 'image-recommendation';
  hint.textContent = `Recommended: ${spec.label}. Must be at least ${MIN_DIMENSION}px.`;
  zone.appendChild(hint);
}

function resetUrlUI(container, imageUrlInput, confirmUrlBtn, uploadContext) {
  const urlPreview = container.querySelector('#urlPreview');
  imageUrlInput.value = '';
  imageUrlInput.style.display = 'block';
  confirmUrlBtn.style.display = 'block';
  if (urlPreview) urlPreview.style.display = 'none';
  uploadContext.selectedUrl = null;
}

async function handleInlineFileSelect(file, context, zone) {
  if (!file.type.startsWith('image/')) {
    showError('Invalid File', 'Please select an image file (JPEG, PNG, WebP)');
    return;
  }

  if (file.size > 5242880) {
    showError('File Too Large', 'Maximum file size is 5MB');
    return;
  }

  try {
    const { img, dataUrl } = await loadImageFromFile(file);
    if (!validateImageDimensions(img)) return;

    // Open cropper — upload immediately on confirm (no second step)
    openCropperModal(dataUrl, context.imageType, async (blob) => {
      try {
        const filename = `${context.boardId}.jpg`;
        const result = await apiClient.uploadImage(context.boardId, blob, filename, true);
        if (result.success) {
          showNotification('Image uploaded successfully');
          const event = new CustomEvent('imageUploaded', {
            detail: { boardId: context.boardId, imageUrl: result.image.url },
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        showError('Upload Failed', error.message);
      }
    });
  } catch (err) {
    showError('Error', err.message);
  }
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
      true
    );

    if (result.success) {
      showNotification('Image set successfully from URL');

      const imageUrlInput = sourceContainer.querySelector('#imageUrl');
      const confirmUrlBtn = sourceContainer.querySelector('#confirmUrlBtn');
      const urlPreview = sourceContainer.querySelector('#urlPreview');
      imageUrlInput.value = '';
      imageUrlInput.style.display = 'block';
      confirmUrlBtn.style.display = 'block';
      urlPreview.style.display = 'none';
      context.selectedUrl = null;

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

export default {
  init: initImageUploader,
  open: openImageUploadModal,
  close: closeImageUploadModal,
  setupInlineUpload: setupInlineUpload,
};
