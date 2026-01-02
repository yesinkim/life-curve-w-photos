// ==================== App State ====================
const state = {
    photos: [],
    selectedYear: null,
    orientation: 'horizontal',
    isDrawingMode: false,
    curvePoints: [],
};

// ==================== DOM Elements ====================
const elements = {
    uploadZone: document.getElementById('uploadZone'),
    uploadButton: document.getElementById('uploadButton'),
    fileInput: document.getElementById('fileInput'),
    photoGrid: document.getElementById('photoGrid'),
    gridItems: document.getElementById('gridItems'),
    photoCount: document.getElementById('photoCount'),
    clearButton: document.getElementById('clearButton'),
    createTimelineButton: document.getElementById('createTimelineButton'),
    uploadSection: document.getElementById('uploadSection'),
    timelineSection: document.getElementById('timelineSection'),
    selectedYear: document.getElementById('selectedYear'),
    drawModeButton: document.getElementById('drawModeButton'),
    resetButton: document.getElementById('resetButton'),
    drawingInstructions: document.getElementById('drawingInstructions'),
    finishDrawingButton: document.getElementById('finishDrawingButton'),
    clearCurveButton: document.getElementById('clearCurveButton'),
    photoModal: document.getElementById('photoModal'),
    modalImage: document.getElementById('modalImage'),
    modalDate: document.getElementById('modalDate'),
    modalDetails: document.getElementById('modalDetails'),
    modalClose: document.getElementById('modalClose'),
    modalBackdrop: document.getElementById('modalBackdrop'),
};

// ==================== File Upload Handlers ====================
elements.uploadZone.addEventListener('click', () => {
    elements.fileInput.click();
});

elements.uploadButton.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.fileInput.click();
});

elements.fileInput.addEventListener('change', handleFileSelect);

// Drag and Drop
elements.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.add('drag-over');
});

elements.uploadZone.addEventListener('dragleave', () => {
    elements.uploadZone.classList.remove('drag-over');
});

elements.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
    );
    processFiles(files);
});

// ==================== File Processing ====================
async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    await processFiles(files);
}

async function processFiles(files) {
    for (const file of files) {
        try {
            const photoData = await extractPhotoData(file);
            state.photos.push(photoData);
        } catch (error) {
            console.error('Error processing file:', file.name, error);
        }
    }

    updatePhotoGrid();
}

async function extractPhotoData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const imageUrl = e.target.result;

                // Extract EXIF data
                let exifData = null;
                let captureDate = null;

                try {
                    exifData = await exifr.parse(file);

                    // Try to get the best date available
                    captureDate = exifData?.DateTimeOriginal ||
                        exifData?.DateTime ||
                        exifData?.CreateDate ||
                        new Date(file.lastModified);
                } catch (exifError) {
                    console.warn('No EXIF data found for:', file.name);
                    captureDate = new Date(file.lastModified);
                }

                // Ensure captureDate is a Date object
                if (!(captureDate instanceof Date)) {
                    captureDate = new Date(captureDate);
                }

                // Mark if date is valid or fallback
                const hasValidDate = exifData && (exifData.DateTimeOriginal || exifData.DateTime || exifData.CreateDate);

                resolve({
                    id: Date.now() + Math.random(),
                    file,
                    imageUrl,
                    captureDate,
                    exifData,
                    name: file.name,
                    hasValidDate,
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==================== Photo Grid Display ====================
function updatePhotoGrid() {
    if (state.photos.length === 0) {
        elements.photoGrid.style.display = 'none';
        return;
    }

    elements.photoGrid.style.display = 'block';
    elements.photoCount.textContent = state.photos.length;

    // Sort photos by date
    const sortedPhotos = [...state.photos].sort((a, b) =>
        a.captureDate - b.captureDate
    );

    elements.gridItems.innerHTML = sortedPhotos.map(photo => `
        <div class="photo-item" data-photo-id="${photo.id}">
            <img src="${photo.imageUrl}" alt="${photo.name}">
            <div class="photo-date">${formatDate(photo.captureDate)}</div>
            <button class="remove-photo" data-photo-id="${photo.id}">×</button>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.photo-item img').forEach(img => {
        img.addEventListener('click', (e) => {
            const photoId = parseFloat(e.target.closest('.photo-item').dataset.photoId);
            showPhotoModal(photoId);
        });
    });

    document.querySelectorAll('.remove-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const photoId = parseFloat(btn.dataset.photoId);
            removePhoto(photoId);
        });
    });
}

function removePhoto(photoId) {
    state.photos = state.photos.filter(p => p.id !== photoId);
    updatePhotoGrid();
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

// ==================== Clear Button ====================
elements.clearButton.addEventListener('click', () => {
    if (confirm('모든 사진을 삭제하시겠습니까?')) {
        state.photos = [];
        updatePhotoGrid();
    }
});

// ==================== Create Timeline ====================
elements.createTimelineButton.addEventListener('click', () => {
    if (state.photos.length === 0) {
        alert('사진을 먼저 업로드해주세요.');
        return;
    }

    // Find the year with most photos
    const yearCounts = {};
    state.photos.forEach(photo => {
        const year = photo.captureDate.getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    const mostCommonYear = Object.keys(yearCounts).reduce((a, b) =>
        yearCounts[a] > yearCounts[b] ? a : b
    );

    state.selectedYear = parseInt(mostCommonYear);
    elements.selectedYear.textContent = state.selectedYear;

    // Filter photos for selected year
    state.photos = state.photos.filter(p =>
        p.captureDate.getFullYear() === state.selectedYear
    );

    // Switch to timeline view
    elements.uploadSection.style.display = 'none';
    elements.timelineSection.style.display = 'block';

    // Initialize timeline
    initializeTimeline();
});

// ==================== Orientation Toggle ====================
document.querySelectorAll('[data-orientation]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-orientation]').forEach(b =>
            b.classList.remove('active')
        );
        e.currentTarget.classList.add('active');
        state.orientation = e.currentTarget.dataset.orientation;
        renderTimeline();
    });
});

// ==================== Drawing Mode ====================
elements.drawModeButton.addEventListener('click', () => {
    state.isDrawingMode = !state.isDrawingMode;

    if (state.isDrawingMode) {
        elements.drawModeButton.style.background = 'var(--gradient-primary)';
        elements.drawingInstructions.style.display = 'flex';
        enableDrawing();
    } else {
        elements.drawModeButton.style.background = '';
        elements.drawingInstructions.style.display = 'none';
        disableDrawing();
    }
});

elements.finishDrawingButton.addEventListener('click', () => {
    state.isDrawingMode = false;
    elements.drawModeButton.style.background = '';
    elements.drawingInstructions.style.display = 'none';
    disableDrawing();
});

elements.clearCurveButton.addEventListener('click', () => {
    state.curvePoints = [];
    renderTimeline();
});

// ==================== Reset Button ====================
elements.resetButton.addEventListener('click', () => {
    if (confirm('처음부터 다시 시작하시겠습니까?')) {
        state.photos = [];
        state.selectedYear = null;
        state.orientation = 'horizontal';
        state.isDrawingMode = false;
        state.curvePoints = [];

        elements.uploadSection.style.display = 'block';
        elements.timelineSection.style.display = 'none';
        elements.fileInput.value = '';
        updatePhotoGrid();
    }
});

// ==================== Photo Modal ====================
function showPhotoModal(photoId) {
    const photo = state.photos.find(p => p.id === photoId);
    if (!photo) return;

    elements.modalImage.src = photo.imageUrl;
    elements.modalDate.textContent = formatDate(photo.captureDate);

    let details = `파일명: ${photo.name}`;
    if (photo.exifData) {
        if (photo.exifData.Make && photo.exifData.Model) {
            details += `\n카메라: ${photo.exifData.Make} ${photo.exifData.Model}`;
        }
    }
    elements.modalDetails.textContent = details;

    elements.photoModal.classList.add('active');
}

function closePhotoModal() {
    elements.photoModal.classList.remove('active');
}

elements.modalClose.addEventListener('click', closePhotoModal);
elements.modalBackdrop.addEventListener('click', closePhotoModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.photoModal.classList.contains('active')) {
        closePhotoModal();
    }
});

// ==================== Initialize ====================
console.log('Life Curve App initialized');
