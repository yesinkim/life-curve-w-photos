// ==================== Timeline Engine ====================
let canvas, ctx;
let canvasWidth, canvasHeight;
let isDrawing = false;
let lastPoint = null;
let isDraggingPhoto = false;
let draggedPhoto = null;
let hoveredPhoto = null;

// Zoom and Pan
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStart = { x: 0, y: 0 };


// ==================== Initialize Timeline ====================
function initializeTimeline() {
    canvas = document.getElementById('timelineCanvas');
    ctx = canvas.getContext('2d');

    // Set canvas size based on orientation
    updateCanvasSize();

    // Initial render
    renderTimeline();

    // Handle window resize
    window.addEventListener('resize', () => {
        updateCanvasSize();
        renderTimeline();
    });

    // Add mouse interaction for hover and drag
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('mouseleave', handleCanvasMouseLeave);

    // Add zoom and pan controls
    canvas.addEventListener('wheel', handleZoom, { passive: false });

    // Pan with space + drag
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function updateCanvasSize() {
    const container = document.getElementById('canvasContainer');
    const rect = container.getBoundingClientRect();

    if (state.orientation === 'horizontal') {
        canvasWidth = rect.width || 1200;
        canvasHeight = 600;
    } else {
        canvasWidth = 800;
        canvasHeight = 1000;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    container.style.height = canvasHeight + 'px';
}

// ==================== Render Timeline ====================
function renderTimeline() {
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#151520');
    gradient.addColorStop(1, '#1f1f2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Save context and apply zoom/pan transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoomLevel, zoomLevel);

    if (state.orientation === 'horizontal') {
        renderHorizontalTimeline();
    } else {
        renderVerticalTimeline();
    }

    // Draw curve if exists
    if (state.curvePoints.length > 0) {
        drawCurve();
    }

    // Restore context before drawing UI elements
    ctx.restore();

    // Draw hover tooltip on top (not affected by zoom/pan)
    drawHoverTooltip();

    // Draw emotion scale reference
    drawEmotionScaleReference();

    // Draw zoom indicator
    drawZoomIndicator();
}

// ==================== Horizontal Timeline ====================
function renderHorizontalTimeline() {
    const padding = 80;
    const timelineY = canvasHeight / 2;
    const timelineStart = padding;
    const timelineEnd = canvasWidth - padding;
    const timelineLength = timelineEnd - timelineStart;

    // Draw main timeline axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(timelineStart, timelineY);
    ctx.lineTo(timelineEnd, timelineY);
    ctx.stroke();

    // Draw month markers
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';

    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    for (let i = 0; i < 12; i++) {
        const x = timelineStart + (timelineLength / 12) * (i + 0.5);

        // Month marker
        ctx.beginPath();
        ctx.moveTo(x, timelineY - 10);
        ctx.lineTo(x, timelineY + 10);
        ctx.stroke();

        // Month label
        ctx.fillText(months[i], x, timelineY + 30);
    }

    // Draw year label
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText(state.selectedYear, timelineStart, 40);

    // Separate photos with and without metadata
    const photosWithDate = state.photos.filter(p => p.hasValidDate !== false);
    const photosWithoutDate = state.photos.filter(p => p.hasValidDate === false);

    // Position and draw photos with dates
    photosWithDate.forEach(photo => {
        const date = photo.captureDate;
        const dayOfYear = getDayOfYear(date);
        const totalDays = isLeapYear(state.selectedYear) ? 366 : 365;

        const x = timelineStart + (timelineLength * dayOfYear / totalDays);

        // Initialize timelineY only once (allows vertical dragging)
        if (photo.timelineY === undefined) {
            photo.timelineY = timelineY;
        }

        // Always update X position based on date
        photo.timelineX = x;

        drawPhoto(photo, x, photo.timelineY);
    });

    // Draw "No Date" zone for photos without metadata
    if (photosWithoutDate.length > 0) {
        drawNoDateZone(timelineStart, 50, 200, 150, photosWithoutDate);
    }
}


// ==================== Vertical Timeline ====================
function renderVerticalTimeline() {
    const padding = 80;
    const timelineX = canvasWidth / 2;
    const timelineStart = padding;
    const timelineEnd = canvasHeight - padding;
    const timelineLength = timelineEnd - timelineStart;

    // Draw main timeline axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(timelineX, timelineStart);
    ctx.lineTo(timelineX, timelineEnd);
    ctx.stroke();

    // Draw month markers
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'right';

    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    for (let i = 0; i < 12; i++) {
        const y = timelineStart + (timelineLength / 12) * (i + 0.5);

        // Month marker
        ctx.beginPath();
        ctx.moveTo(timelineX - 10, y);
        ctx.lineTo(timelineX + 10, y);
        ctx.stroke();

        // Month label
        ctx.fillText(months[i], timelineX - 20, y + 4);
    }

    // Draw year label
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(state.selectedYear, canvasWidth / 2, 40);

    // Separate photos with and without metadata
    const photosWithDate = state.photos.filter(p => p.hasValidDate !== false);
    const photosWithoutDate = state.photos.filter(p => p.hasValidDate === false);

    // Position and draw photos with dates
    photosWithDate.forEach(photo => {
        const date = photo.captureDate;
        const dayOfYear = getDayOfYear(date);
        const totalDays = isLeapYear(state.selectedYear) ? 366 : 365;

        const y = timelineStart + (timelineLength * dayOfYear / totalDays);

        // Initialize timelineX only once (allows horizontal dragging)
        if (photo.timelineX === undefined) {
            photo.timelineX = timelineX;
        }

        // Always update Y position based on date
        photo.timelineY = y;

        drawPhoto(photo, photo.timelineX, y);
    });

    // Draw "No Date" zone for photos without metadata
    if (photosWithoutDate.length > 0) {
        drawNoDateZone(50, timelineStart, 150, 200, photosWithoutDate);
    }
}

// ==================== Draw Photo on Canvas ====================
function drawPhoto(photo, x, y, customSize = null) {
    const size = customSize || 60;
    const halfSize = size / 2;

    // Cache loaded image for performance
    if (!photo.cachedImage) {
        photo.cachedImage = new Image();
        photo.cachedImage.src = photo.imageUrl;
    }

    const img = photo.cachedImage;

    // Function to draw (called immediately if loaded, or on load)
    const drawImageContent = () => {
        // Draw shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Draw photo with rounded corners
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, x - halfSize, y - halfSize, size, size, 8);
        ctx.clip();
        ctx.drawImage(img, x - halfSize, y - halfSize, size, size);
        ctx.restore();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw border (highlight if hovered)
        const isHovered = hoveredPhoto === photo;
        ctx.strokeStyle = isHovered ? 'rgba(139, 92, 246, 0.8)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.beginPath();
        roundRect(ctx, x - halfSize, y - halfSize, size, size, 8);
        ctx.stroke();

        // Draw glow if hovered
        if (isHovered) {
            ctx.shadowColor = 'rgba(139, 92, 246, 0.6)';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            roundRect(ctx, x - halfSize, y - halfSize, size, size, 8);
            ctx.stroke();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        // Draw emotion level if dragging this photo
        if (isDraggingPhoto && draggedPhoto === photo) {
            drawEmotionLevel(photo, x, y);
        }
    };

    // Draw immediately if already loaded, otherwise wait for load
    if (img.complete && img.naturalWidth > 0) {
        drawImageContent();
    } else {
        img.onload = drawImageContent;
    }
}

// ==================== Drawing Mode ====================
function enableDrawing() {
    canvas.style.cursor = 'crosshair';

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch support
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);
}

function disableDrawing() {
    canvas.style.cursor = 'default';

    canvas.removeEventListener('mousedown', startDrawing);
    canvas.removeEventListener('mousemove', draw);
    canvas.removeEventListener('mouseup', stopDrawing);
    canvas.removeEventListener('mouseleave', stopDrawing);

    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    state.curvePoints.push({ ...lastPoint });
}

function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const currentPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };

    state.curvePoints.push({ ...currentPoint });
    lastPoint = currentPoint;

    // Render immediately for smooth drawing
    renderTimeline();
}

function stopDrawing() {
    isDrawing = false;
    lastPoint = null;
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

// ==================== Draw Curve ====================
function drawCurve() {
    if (state.curvePoints.length < 2) return;

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw gradient shadow
    ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.moveTo(state.curvePoints[0].x, state.curvePoints[0].y);

    // Use quadratic curves for smoother lines
    for (let i = 1; i < state.curvePoints.length - 1; i++) {
        const xc = (state.curvePoints[i].x + state.curvePoints[i + 1].x) / 2;
        const yc = (state.curvePoints[i].y + state.curvePoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(state.curvePoints[i].x, state.curvePoints[i].y, xc, yc);
    }

    // Last segment
    const lastIdx = state.curvePoints.length - 1;
    ctx.lineTo(state.curvePoints[lastIdx].x, state.curvePoints[lastIdx].y);
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

// ==================== Utility Functions ====================
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function isLeapYear(year) {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// ==================== No Date Zone ====================
function drawNoDateZone(x, y, width, height, photos) {
    // Draw zone background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    roundRect(ctx, x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw label
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('날짜 정보 없음', x + width / 2, y + 20);
    ctx.fillText('(드래그하여 배치)', x + width / 2, y + 35);

    // Position photos in grid
    const photoSize = 50;
    const gap = 10;
    const cols = Math.floor((width - gap * 2) / (photoSize + gap));

    photos.forEach((photo, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        const photoX = x + gap + col * (photoSize + gap) + photoSize / 2;
        const photoY = y + 50 + row * (photoSize + gap) + photoSize / 2;

        // Initialize position if not set
        if (!photo.timelineX || !photo.timelineY) {
            photo.timelineX = photoX;
            photo.timelineY = photoY;
        }

        drawPhoto(photo, photo.timelineX, photo.timelineY, photoSize);
    });
}

// ==================== Mouse Interaction ====================
function handleCanvasMouseMove(e) {
    // Allow photo dragging even in drawing mode, but not while actively drawing
    if (state.isDrawingMode && isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    // Handle space+drag panning
    if (spacePressed && isPanning) {
        const dx = mouseX - panStart.x;
        const dy = mouseY - panStart.y;
        panX += dx;
        panY += dy;
        panStart = { x: mouseX, y: mouseY };
        renderTimeline();
        return;
    }

    // Transform mouse coordinates for zoom/pan
    mouseX = (mouseX - panX) / zoomLevel;
    mouseY = (mouseY - panY) / zoomLevel;

    // Handle photo dragging with axis constraint
    if (isDraggingPhoto && draggedPhoto) {
        // Store original position if not already stored
        if (!draggedPhoto.originalX) {
            draggedPhoto.originalX = draggedPhoto.timelineX;
        }
        if (!draggedPhoto.originalY) {
            draggedPhoto.originalY = draggedPhoto.timelineY;
        }

        // Constrain movement perpendicular to timeline axis
        if (state.orientation === 'horizontal') {
            // Horizontal timeline: allow vertical movement only
            draggedPhoto.timelineX = draggedPhoto.originalX || draggedPhoto.timelineX;
            draggedPhoto.timelineY = mouseY;
        } else {
            // Vertical timeline: allow horizontal movement only
            draggedPhoto.timelineX = mouseX;
            draggedPhoto.timelineY = draggedPhoto.originalY || draggedPhoto.timelineY;
        }

        renderTimeline();
        return;
    }

    // Check for photo hover
    const previousHovered = hoveredPhoto;
    hoveredPhoto = findPhotoAtPosition(mouseX, mouseY);

    if (hoveredPhoto !== previousHovered) {
        renderTimeline();
    }

    // Update cursor
    if (spacePressed) {
        canvas.style.cursor = isPanning ? 'grabbing' : 'grab';
    } else {
        canvas.style.cursor = hoveredPhoto ? 'pointer' : 'default';
    }
}

function handleCanvasMouseDown(e) {
    // In drawing mode, check if clicking on a photo first
    // If not, start drawing; if yes, allow photo drag

    const rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    // Handle space+drag panning start
    if (spacePressed) {
        isPanning = true;
        panStart = { x: mouseX, y: mouseY };
        canvas.style.cursor = 'grabbing';
        return;
    }

    // Transform mouse coordinates
    mouseX = (mouseX - panX) / zoomLevel;
    mouseY = (mouseY - panY) / zoomLevel;

    const photo = findPhotoAtPosition(mouseX, mouseY);
    if (photo) {
        isDraggingPhoto = true;
        draggedPhoto = photo;
        canvas.style.cursor = 'grabbing';
    } else if (state.isDrawingMode) {
        // No photo clicked, start drawing if in draw mode
        startDrawing(e);
    }
}

function handleCanvasMouseUp(e) {
    // End panning
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = spacePressed ? 'grab' : (hoveredPhoto ? 'pointer' : 'default');
    }

    // End photo dragging
    if (isDraggingPhoto) {
        isDraggingPhoto = false;

        // Clear original position tracking
        if (draggedPhoto) {
            delete draggedPhoto.originalX;
            delete draggedPhoto.originalY;
        }

        draggedPhoto = null;
        canvas.style.cursor = hoveredPhoto ? 'pointer' : 'default';
    }
}

function handleCanvasMouseLeave() {
    if (hoveredPhoto) {
        hoveredPhoto = null;
        renderTimeline();
    }
}

function findPhotoAtPosition(x, y) {
    const photoSize = 60;
    const halfSize = photoSize / 2;

    for (const photo of state.photos) {
        if (!photo.timelineX || !photo.timelineY) continue;

        const dx = x - photo.timelineX;
        const dy = y - photo.timelineY;

        if (Math.abs(dx) <= halfSize && Math.abs(dy) <= halfSize) {
            return photo;
        }
    }

    return null;
}

// ==================== Draw Hover Tooltip ====================
function drawHoverTooltip() {
    if (!hoveredPhoto || !hoveredPhoto.timelineX || !hoveredPhoto.timelineY) return;

    const photo = hoveredPhoto;
    const x = photo.timelineX;
    const y = photo.timelineY;

    // Draw guide line based on orientation
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();

    if (state.orientation === 'horizontal') {
        // Vertical guide line
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
    } else {
        // Horizontal guide line
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw tooltip
    const dateText = photo.hasValidDate !== false
        ? formatDetailedDate(photo.captureDate)
        : '날짜 정보 없음';

    ctx.font = '14px Inter, sans-serif';
    const textWidth = ctx.measureText(dateText).width;
    const padding = 12;
    const tooltipWidth = textWidth + padding * 2;
    const tooltipHeight = 32;

    // Position tooltip
    let tooltipX = x - tooltipWidth / 2;
    let tooltipY = y - 90;

    // Keep tooltip in bounds
    if (tooltipX < 10) tooltipX = 10;
    if (tooltipX + tooltipWidth > canvasWidth - 10) tooltipX = canvasWidth - tooltipWidth - 10;
    if (tooltipY < 10) tooltipY = y + 70;

    // Draw tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Draw tooltip text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(dateText, tooltipX + tooltipWidth / 2, tooltipY + tooltipHeight / 2 + 5);
}

function formatDetailedDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
}

// ==================== Emotion Level System ====================
function calculateEmotionLevel(photo) {
    if (!photo.initialTimelineY) {
        // Save initial position when first dragged
        photo.initialTimelineY = state.orientation === 'horizontal' ? canvasHeight / 2 : photo.timelineY;
    }

    const centerY = state.orientation === 'horizontal' ? canvasHeight / 2 : photo.initialTimelineY;
    const maxDistance = canvasHeight / 4; // 1/4 of canvas height = level 10

    // Calculate distance from center
    const distance = centerY - photo.timelineY;

    // Convert to -10 to +10 scale
    let level = Math.round((distance / maxDistance) * 10);
    level = Math.max(-10, Math.min(10, level)); // Clamp to -10 ~ +10

    return level;
}

function drawEmotionLevel(photo, x, y) {
    const level = calculateEmotionLevel(photo);

    // Draw level badge
    const badgeWidth = 50;
    const badgeHeight = 30;
    const badgeX = x + 40;
    const badgeY = y - 15;

    // Badge background
    const color = level > 0 ? 'rgba(99, 102, 241, 0.95)' : level < 0 ? 'rgba(236, 72, 153, 0.95)' : 'rgba(139, 92, 246, 0.95)';
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Level text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const levelText = level > 0 ? `+${level}` : `${level}`;
    ctx.fillText(levelText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
}

function drawEmotionScaleReference() {
    if (state.orientation !== 'horizontal') return;

    const padding = 30;
    const scaleX = canvasWidth - 80;
    const centerY = canvasHeight / 2;
    const lineHeight = canvasHeight / 4;

    // Draw scale line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleX, centerY - lineHeight);
    ctx.lineTo(scaleX, centerY + lineHeight);
    ctx.stroke();

    // Draw markers and labels
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'left';

    // +10
    ctx.beginPath();
    ctx.moveTo(scaleX - 5, centerY - lineHeight);
    ctx.lineTo(scaleX + 5, centerY - lineHeight);
    ctx.stroke();
    ctx.fillStyle = 'rgba(99, 102, 241, 0.7)';
    ctx.fillText('+10', scaleX + 10, centerY - lineHeight + 4);

    // 0
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(scaleX - 8, centerY);
    ctx.lineTo(scaleX + 8, centerY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('0', scaleX + 10, centerY + 4);

    // -10
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(scaleX - 5, centerY + lineHeight);
    ctx.lineTo(scaleX + 5, centerY + lineHeight);
    ctx.stroke();
    ctx.fillStyle = 'rgba(236, 72, 153, 0.7)';
    ctx.fillText('-10', scaleX + 10, centerY + lineHeight + 4);
}

// ==================== Zoom and Pan Handlers ====================
function handleZoom(e) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom
    const zoomIntensity = 0.1;
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = zoomLevel + delta * zoomIntensity;

    // Limit zoom range
    const minZoom = 0.5;
    const maxZoom = 3;
    if (newZoom < minZoom || newZoom > maxZoom) return;

    // Zoom towards mouse position
    const zoomPointX = (mouseX - panX) / zoomLevel;
    const zoomPointY = (mouseY - panY) / zoomLevel;

    panX = mouseX - zoomPointX * newZoom;
    panY = mouseY - zoomPointY * newZoom;
    zoomLevel = newZoom;

    renderTimeline();
}

let spacePressed = false;

function handleKeyDown(e) {
    if (e.code === 'Space' && !spacePressed) {
        spacePressed = true;
        canvas.style.cursor = 'grab';
        e.preventDefault();
    }

    // Arrow key panning
    const panSpeed = 20;
    if (e.code === 'ArrowLeft') {
        panX += panSpeed;
        renderTimeline();
    } else if (e.code === 'ArrowRight') {
        panX -= panSpeed;
        renderTimeline();
    } else if (e.code === 'ArrowUp') {
        panY += panSpeed;
        renderTimeline();
    } else if (e.code === 'ArrowDown') {
        panY -= panSpeed;
        renderTimeline();
    }

    // Reset zoom
    if (e.code === 'Digit0' || e.code === 'Numpad0') {
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        renderTimeline();
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space') {
        spacePressed = false;
        canvas.style.cursor = hoveredPhoto ? 'pointer' : 'default';
    }
}

function drawZoomIndicator() {
    ctx.save();

    // Position at bottom-right corner
    const indicatorX = canvasWidth - 120;
    const indicatorY = canvasHeight - 50;
    const indicatorWidth = 100;
    const indicatorHeight = 40;

    // Draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, indicatorX, indicatorY, indicatorWidth, indicatorHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Draw magnifying glass icon
    const iconX = indicatorX + 15;
    const iconY = indicatorY + 20;
    const iconRadius = 8;

    // Glass circle
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Handle
    ctx.beginPath();
    ctx.moveTo(iconX + iconRadius * 0.7, iconY + iconRadius * 0.7);
    ctx.lineTo(iconX + iconRadius * 1.5, iconY + iconRadius * 1.5);
    ctx.stroke();

    // Plus sign for zoom in
    if (zoomLevel > 1) {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
        ctx.lineWidth = 1.5;
        const plusSize = 4;
        ctx.beginPath();
        ctx.moveTo(iconX - plusSize, iconY);
        ctx.lineTo(iconX + plusSize, iconY);
        ctx.moveTo(iconX, iconY - plusSize);
        ctx.lineTo(iconX, iconY + plusSize);
        ctx.stroke();
    }

    // Zoom percentage text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const zoomText = `${Math.round(zoomLevel * 100)}%`;
    ctx.fillText(zoomText, iconX + 20, iconY);

    ctx.restore();
}
