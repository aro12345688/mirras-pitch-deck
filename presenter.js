/* ==========================================
   Mirras Dance Academy Presenter Console JS
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const notesContent = document.getElementById('notesContent');
  const currentSlideNum = document.getElementById('currentSlideNum');
  const currentSlideTitle = document.getElementById('currentSlideTitle');
  const nextSlideTitle = document.getElementById('nextSlideTitle');
  const jumpSelector = document.getElementById('jumpSelector');
  const prevBtn = document.getElementById('consolePrevBtn');
  const nextBtn = document.getElementById('consoleNextBtn');
  
  // Timer Elements
  const timerDisplay = document.getElementById('timerDisplay');
  const timerPlayBtn = document.getElementById('timerPlayBtn');
  const timerPlayIcon = document.getElementById('timerPlayIcon');
  const timerResetBtn = document.getElementById('timerResetBtn');

  // Broadcast Channel connection
  const syncChannel = new BroadcastChannel('mirras_deck_sync');

  // Presentation slides directory (indexed titles matches HTML order)
  const slideTitles = [
    "Cover Slide",
    "Today's Students Need More Than Academics",
    "The Challenge Schools Face",
    "Our Solution: Certification Program",
    "Benefits for Students",
    "Benefits for Schools",
    "Program Structure Roadmap",
    "International Certification & Mockup",
    "Why Mirras Dance Academy?",
    "Student Outcomes & Transformation",
    "School Showcase Event",
    "Partner With Us (Free Demonstration Workshop)"
  ];

  // --- 1. Broadcast Sync Layer ---
  
  // Handle state updates from main slide deck window
  syncChannel.addEventListener('message', (event) => {
    const data = event.data;
    if (data.type === 'state-update') {
      const index = data.index;
      
      // Update Current Slide info
      currentSlideNum.textContent = `${index + 1} / ${data.total}`;
      currentSlideTitle.textContent = slideTitles[index] || `Slide ${index + 1}`;
      
      // Update Next Slide Preview
      nextSlideTitle.textContent = data.nextSlideTitle || 'End of Presentation';
      
      // Update notes
      notesContent.textContent = data.notes;
      
      // Sync dropdown selector
      jumpSelector.value = index;
    }
  });

  // Request current state from the main deck window (in case it's already open)
  syncChannel.postMessage({ type: 'get-initial-state' });

  // Broadcast Navigation triggers back to the main deck
  prevBtn.addEventListener('click', () => {
    syncChannel.postMessage({ type: 'navigate', direction: 'prev' });
  });

  nextBtn.addEventListener('click', () => {
    syncChannel.postMessage({ type: 'navigate', direction: 'next' });
  });

  jumpSelector.addEventListener('change', () => {
    const index = parseInt(jumpSelector.value, 10);
    syncChannel.postMessage({ type: 'navigate', action: 'jump', index: index });
  });

  // Keyboard Navigation inside Presenter view (Forward/Back)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      syncChannel.postMessage({ type: 'navigate', direction: 'next' });
    } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      syncChannel.postMessage({ type: 'navigate', direction: 'prev' });
    }
  });

  // --- 2. Stopwatch Timer Logic ---
  let timerInterval = null;
  let elapsedSeconds = 0;
  let isTimerRunning = false;

  function updateTimerDisplay() {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');
    
    timerDisplay.textContent = `${minStr}:${secStr}`;
  }

  function startTimer() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    // Swap Play icon to Pause SVG
    timerPlayIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
    timerPlayBtn.title = "Pause Timer";
    
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function pauseTimer() {
    if (!isTimerRunning) return;
    
    isTimerRunning = false;
    // Swap Pause icon back to Play SVG
    timerPlayIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
    timerPlayBtn.title = "Start Timer";
    
    clearInterval(timerInterval);
  }

  function toggleTimer() {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function resetTimer() {
    pauseTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
  }

  timerPlayBtn.addEventListener('click', toggleTimer);
  timerResetBtn.addEventListener('click', resetTimer);

  // Auto-start timer on load for speaker convenience
  startTimer();
});
