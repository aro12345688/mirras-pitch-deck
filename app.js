/* ==========================================
   Mirras Dance Academy Pitch Deck Controller
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const deckContainer = document.querySelector('.deck-container');
  const slideWrapper = document.getElementById('slideWrapper');
  const slides = document.querySelectorAll('.slide');
  const slideCounter = document.getElementById('slideCounter');
  const progressBar = document.getElementById('progressBar');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const notesBtn = document.getElementById('notesBtn');
  const configBtn = document.getElementById('configBtn');
  const configModal = document.getElementById('configModal');
  const laserToggle = document.getElementById('laserToggle');
  const penToggle = document.getElementById('penToggle');
  const laserPointer = document.getElementById('laserPointer');
  const drawCanvas = document.getElementById('drawCanvas');
  const blackout = document.getElementById('blackout');

  // Presentation State
  let currentSlideIndex = 0;
  const totalSlides = slides.length;
  let scaleFactor = 1;
  let isLaserActive = false;
  let isPenActive = false;
  let isDrawing = false;
  let isBlackout = false;
  let currentTheme = 'sky';

  // Broadcast Channel for Presenter View Sync
  const syncChannel = new BroadcastChannel('mirras_deck_sync');

  // Drawing Canvas Context
  const ctx = drawCanvas.getContext('2d');
  setupCanvasDimensions();

  // --- 1. Responsive 16:9 Scaling ---
  function scaleDeck() {
    const targetWidth = 1920;
    const targetHeight = 1080;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Calculate scale factor to fit window
    scaleFactor = Math.min(windowWidth / targetWidth, windowHeight / targetHeight);
    
    // Apply transform scale
    slideWrapper.style.transform = `scale(${scaleFactor})`;
  }

  // Initial Scale & Resize Bind
  scaleDeck();
  window.addEventListener('resize', () => {
    scaleDeck();
    setupCanvasDimensions();
  });

  function setupCanvasDimensions() {
    drawCanvas.width = 1920;
    drawCanvas.height = 1080;
    ctx.strokeStyle = '#ef4444'; // drawing line color
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  // --- 2. Slide Navigation System ---
  function updateUI() {
    // Counter
    slideCounter.textContent = `Slide ${currentSlideIndex + 1} / ${totalSlides}`;
    
    // Progress Bar
    const progressPercent = ((currentSlideIndex + 1) / totalSlides) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Clear drawings on slide change
    clearCanvas();

    // Reset Pointer/Pen states to make presentation flow clean
    disableDrawingMode();
    disableLaserMode();
  }

  function goToSlide(index, direction = 'forward') {
    if (index < 0 || index >= totalSlides) return;
    if (index === currentSlideIndex) return;

    const updateDOM = () => {
      slides[currentSlideIndex].classList.remove('active');
      slides[index].classList.add('active');
      currentSlideIndex = index;
      
      // Update URL hash
      window.location.hash = `slide-${index + 1}`;

      // Update Controls UI
      updateUI();
      
      // Broadcast state change to presenter notes
      sendSyncState();
    };

    // Use CSS View Transitions API (Progressive Enhancement)
    if (document.startViewTransition) {
      document.startViewTransition({
        update: updateDOM,
        types: [direction]
      });
    } else {
      updateDOM();
    }
  }

  function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
      goToSlide(currentSlideIndex + 1, 'forward');
    }
  }

  function prevSlide() {
    if (currentSlideIndex > 0) {
      goToSlide(currentSlideIndex - 1, 'backward');
    }
  }

  // Parse URL Hash on Load
  function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#slide-')) {
      const slideNum = parseInt(hash.replace('#slide-', ''), 10);
      if (!isNaN(slideNum) && slideNum >= 1 && slideNum <= totalSlides) {
        const index = slideNum - 1;
        const direction = index > currentSlideIndex ? 'forward' : 'backward';
        goToSlide(index, direction);
      }
    }
  }

  // Listen to hash change
  window.addEventListener('hashchange', handleHashChange);
  
  // Set initial slide on load if hash present
  if (window.location.hash) {
    handleHashChange();
  } else {
    // Broadcast initial state
    setTimeout(sendSyncState, 500);
  }

  // --- 3. Synchronized Presenter Messaging ---
  function sendSyncState() {
    const activeSlide = slides[currentSlideIndex];
    const notes = activeSlide.getAttribute('data-notes') || 'No notes for this slide.';
    
    // Get next slide title/thumbnail text if available
    let nextTitle = 'End of Presentation';
    if (currentSlideIndex < totalSlides - 1) {
      const nextSlideEl = slides[currentSlideIndex + 1];
      const titleEl = nextSlideEl.querySelector('.slide-title') || nextSlideEl.querySelector('.cover-title-main');
      nextTitle = titleEl ? titleEl.textContent : `Slide ${currentSlideIndex + 2}`;
    }

    syncChannel.postMessage({
      type: 'state-update',
      index: currentSlideIndex,
      total: totalSlides,
      notes: notes,
      nextSlideTitle: nextTitle
    });
  }

  // Listen for navigation requests from Presenter Notes console
  syncChannel.addEventListener('message', (event) => {
    const data = event.data;
    if (data.type === 'navigate') {
      if (data.direction === 'next') {
        nextSlide();
      } else if (data.direction === 'prev') {
        prevSlide();
      } else if (data.action === 'jump') {
        const index = data.index;
        const direction = index > currentSlideIndex ? 'forward' : 'backward';
        goToSlide(index, direction);
      }
    } else if (data.type === 'get-initial-state') {
      sendSyncState();
    }
  });

  // --- 4. Interactive Tools (Laser Pointer & Sketch Pen) ---
  
  // Laser Pointer Logic
  function enableLaserMode() {
    isLaserActive = true;
    laserToggle.checked = true;
    disableDrawingMode();
    slideWrapper.classList.add('laser-active');
  }

  function disableLaserMode() {
    isLaserActive = false;
    laserToggle.checked = false;
    laserPointer.style.display = 'none';
    slideWrapper.classList.remove('laser-active');
  }

  // Mouse Move tracking for Laser Pointer
  slideWrapper.addEventListener('mousemove', (e) => {
    if (!isLaserActive) return;
    
    const rect = slideWrapper.getBoundingClientRect();
    
    // Convert client position to wrapper-relative coordinates
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Adjust for JS scale factor
    const wrapperX = x / scaleFactor;
    const wrapperY = y / scaleFactor;
    
    laserPointer.style.display = 'block';
    laserPointer.style.left = `${wrapperX}px`;
    laserPointer.style.top = `${wrapperY}px`;
  });

  slideWrapper.addEventListener('mouseleave', () => {
    laserPointer.style.display = 'none';
  });

  // Sketch Canvas Drawing Logic
  function enableDrawingMode() {
    isPenActive = true;
    penToggle.checked = true;
    disableLaserMode();
    slideWrapper.classList.add('drawing-active');
  }

  function disableDrawingMode() {
    isPenActive = false;
    penToggle.checked = false;
    slideWrapper.classList.remove('drawing-active');
    isDrawing = false;
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }

  function getCanvasCoords(e) {
    const rect = drawCanvas.getBoundingClientRect();
    // Translate mouse client coordinates to scaled canvas coordinates
    return {
      x: (e.clientX - rect.left) / scaleFactor,
      y: (e.clientY - rect.top) / scaleFactor
    };
  }

  drawCanvas.addEventListener('mousedown', (e) => {
    if (!isPenActive) return;
    isDrawing = true;
    const coords = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  });

  drawCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || !isPenActive) return;
    const coords = getCanvasCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  });

  window.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  // Blackout Functionality
  function toggleBlackout() {
    isBlackout = !isBlackout;
    blackout.classList.toggle('active', isBlackout);
  }

  // --- 5. Configuration & Themes ---
  
  // Theme Switching
  const themeOptions = document.querySelectorAll('.theme-opt');
  themeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      themeOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      
      const theme = opt.getAttribute('data-theme');
      currentTheme = theme;
      
      // Update theme selector on DOM
      if (theme === 'sky') {
        deckContainer.removeAttribute('data-theme');
      } else {
        deckContainer.setAttribute('data-theme', theme);
      }

      // Close modal
      configModal.classList.remove('show');
    });
  });

  // Config Button Toggle
  configBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    configModal.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!configModal.contains(e.target) && e.target !== configBtn) {
      configModal.classList.remove('show');
    }
  });

  // Tools Panel Toggles
  laserToggle.addEventListener('change', () => {
    if (laserToggle.checked) {
      enableLaserMode();
    } else {
      disableLaserMode();
    }
  });

  penToggle.addEventListener('change', () => {
    if (penToggle.checked) {
      enableDrawingMode();
    } else {
      disableDrawingMode();
    }
  });

  // --- 6. Event Listeners (Keyboard, Click, Swipe) ---
  
  // Controls Click Nav
  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);

  // Notes View Launcher
  notesBtn.addEventListener('click', () => {
    window.open('presenter.html', 'MDA_PresenterNotes', 'width=1000,height=700,menubar=no,toolbar=no,location=no,status=no');
  });

  // Fullscreen Handling
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // Keyboard Navigation & Shortcuts
  document.addEventListener('keydown', (e) => {
    // If typing in any input element (none currently present, but good practice)
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    switch (e.key) {
      // Advance Slide
      case 'ArrowRight':
      case ' ':
      case 'Enter':
      case 'PageDown':
        nextSlide();
        e.preventDefault();
        break;
      
      // Reverse Slide
      case 'ArrowLeft':
      case 'Backspace':
      case 'PageUp':
        prevSlide();
        e.preventDefault();
        break;

      // Fullscreen
      case 'f':
      case 'F':
        toggleFullscreen();
        break;

      // Blackout
      case 'b':
      case 'B':
        toggleBlackout();
        break;

      // Laser Pointer
      case 'l':
      case 'L':
        if (isLaserActive) {
          disableLaserMode();
        } else {
          enableLaserMode();
        }
        break;

      // Drawing Pen
      case 'p':
      case 'P':
        if (isPenActive) {
          disableDrawingMode();
        } else {
          enableDrawingMode();
        }
        break;

      // Clear Sketches
      case 'c':
      case 'C':
        clearCanvas();
        break;

      // Cancel modes on Escape
      case 'Escape':
        disableDrawingMode();
        disableLaserMode();
        if (isBlackout) toggleBlackout();
        configModal.classList.remove('show');
        break;
    }
  });

  // Touch / Mobile Swipe Navigation
  let touchStartX = 0;
  let touchEndX = 0;

  deckContainer.addEventListener('touchstart', (e) => {
    // Avoid swipe conflict with drawing pen
    if (isPenActive) return;
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  deckContainer.addEventListener('touchend', (e) => {
    if (isPenActive) return;
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 80;
    if (touchStartX - touchEndX > swipeThreshold) {
      // Swiped Left -> Advance
      nextSlide();
    } else if (touchEndX - touchStartX > swipeThreshold) {
      // Swiped Right -> Reverse
      prevSlide();
    }
  }
});
