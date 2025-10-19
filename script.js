document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let currentFile = null;

    // DOM Elements
    const uploadView = document.getElementById('upload-view');
    const optionsView = document.getElementById('options-view');
    const loadingView = document.getElementById('loading-view');
    const downloadView = document.getElementById('download-view');
    const contactView = document.getElementById('contact-view');

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    
    const imagePreview = document.getElementById('image-preview');
    const originalSizeEl = document.getElementById('original-size');

    const imageOptions = document.getElementById('image-options');
    const formatSelect = document.getElementById('format-select');

    const compressButton = document.getElementById('compress-button');
    const startOverButton = document.getElementById('start-over-button');
    const compressAnotherButton = document.getElementById('compress-another-button');
    
    const downloadButton = document.getElementById('download-button');
    const resultOriginalSize = document.getElementById('result-original-size');
    const resultCompressedSize = document.getElementById('result-compressed-size');
    const resultSavings = document.getElementById('result-savings');

    const customAlert = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('alert-message');
    const alertOkButton = document.getElementById('alert-ok-button');

    // Navigation Elements
    const navHome = document.getElementById('nav-home');
    const navContact = document.getElementById('nav-contact');
    const contactBackButton = document.getElementById('contact-back-button');

    // --- Event Listeners ---

    uploadButton.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-slate-800');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-slate-800');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-slate-800');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });

    compressButton.addEventListener('click', () => {
        if (!currentFile) return;
        showView(loadingView);
        setTimeout(() => { // Simulate processing time for better UX
            compressImage();
        }, 500);
    });
    
    startOverButton.addEventListener('click', resetApp);
    compressAnotherButton.addEventListener('click', resetApp);
    alertOkButton.addEventListener('click', () => customAlert.classList.add('hidden'));

    // Navigation event listeners
    navHome.addEventListener('click', (e) => {
        e.preventDefault();
        resetApp();
    });
    navContact.addEventListener('click', (e) => {
        e.preventDefault();
        showView(contactView);
    });
    contactBackButton.addEventListener('click', () => {
        resetApp(); 
    });


    // --- Core Functions ---

    function handleFile(file) {
        if (!file) return;
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (validImageTypes.includes(file.type)) {
            currentFile = file;
            setupOptionsView();
        } else {
            showAlert('Unsupported file type. Please select a PNG, JPG, or WEBP file.');
            return;
        }
    }

    function setupOptionsView() {
        originalSizeEl.textContent = `Original size: ${formatBytes(currentFile.size)}`;
        
        imageOptions.classList.remove('hidden');
        imagePreview.classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = (e) => imagePreview.src = e.target.result;
        reader.readAsDataURL(currentFile);
        
        const extension = currentFile.type.split('/')[1];
        if (['jpeg', 'png', 'webp'].includes(extension)) {
             formatSelect.value = extension;
        }
        
        showView(optionsView);
    }

    // Helper to promisify canvas.toBlob
    function getBlobFromCanvas(canvas, format, quality) {
        return new Promise(resolve => canvas.toBlob(resolve, format, quality));
    }

    async function compressImage() {
        const targetSizeInput = document.getElementById('image-size-input');
        const targetSizeUnit = document.getElementById('image-size-unit');
        let targetSize = parseInt(targetSizeInput.value, 10);
        if (isNaN(targetSize) || targetSize <= 0) {
            showAlert('Please enter a valid target size.');
            showView(optionsView);
            return;
        }
        const targetBytes = targetSizeUnit.value === 'KB' ? targetSize * 1024 : targetSize * 1024 * 1024;

        if (targetBytes >= currentFile.size) {
            showAlert('Target size must be smaller than the original file size.');
            showView(optionsView);
            return;
        }

        const format = `image/${formatSelect.value}`;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                if (format === 'image/png') {
                    showAlert('For best results and target size compression, please choose JPG or WEBP. PNG compression is lossless and may not reduce size significantly.');
                    const blob = await getBlobFromCanvas(canvas, format);
                    const url = URL.createObjectURL(blob);
                    showDownloadView(currentFile.size, blob.size, url, `compressed.png`);
                    return;
                }

                let minQuality = 0;
                let maxQuality = 1;
                let bestBlob = null;
                
                // Increased iterations for more accurate search
                for (let i = 0; i < 10; i++) { 
                    const quality = (minQuality + maxQuality) / 2;
                    const blob = await getBlobFromCanvas(canvas, format, quality);
                    
                    if (blob.size <= targetBytes) {
                        minQuality = quality;
                        bestBlob = blob;
                    } else {
                        maxQuality = quality;
                    }
                }

                if (!bestBlob) { 
                   bestBlob = await getBlobFromCanvas(canvas, format, 0.1);
                }

                const compressedUrl = URL.createObjectURL(bestBlob);
                showDownloadView(currentFile.size, bestBlob.size, compressedUrl, `compressed.${formatSelect.value}`);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(currentFile);
    }
    
    function showDownloadView(originalSize, compressedSize, url, filename) {
        resultOriginalSize.textContent = formatBytes(originalSize);
        resultCompressedSize.textContent = formatBytes(compressedSize);

        const savings = originalSize - compressedSize;
        const percentageSaved = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0;
        resultSavings.textContent = `${formatBytes(savings)} (${percentageSaved}%)`;

        downloadButton.href = url;
        downloadButton.download = filename;
        
        showView(downloadView);
    }

    function resetApp() {
        currentFile = null;
        fileInput.value = ''; 
        if (downloadButton.href && downloadButton.href.startsWith('blob:')) {
             URL.revokeObjectURL(downloadButton.href);
        }
        showView(uploadView);
    }

    function showView(viewToShow) {
        [uploadView, optionsView, loadingView, downloadView, contactView].forEach(view => {
            view.classList.add('hidden');
        });
        viewToShow.classList.remove('hidden');
    }

    function showAlert(message) {
        alertMessage.textContent = message;
        customAlert.classList.remove('hidden');
    }
    
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});