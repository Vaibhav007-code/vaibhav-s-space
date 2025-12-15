// ============================================
// VAIBHAV'S SPACE — PUBLIC APP
// Serverless audio diary with real-time sync
// ============================================

const API_URL = window.location.origin;

let entries = [];
let currentAudio = null;
let currentEntryId = null;
let pollInterval = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initIntroAnimation();
    loadEntries();
    trackVisit();
    startPolling();
});

// ===== INTRO ANIMATION =====
function initIntroAnimation() {
    const overlay = document.getElementById('introOverlay');

    // Fade out after 3 seconds
    setTimeout(() => {
        overlay.classList.add('fade-out');

        // Remove from DOM after animation
        setTimeout(() => {
            overlay.remove();
        }, 600);
    }, 3000);
}

// ===== POLLING FOR UPDATES =====
function startPolling() {
    // Poll every 5 seconds for new entries
    pollInterval = setInterval(loadEntries, 5000);
}

// ===== LOAD ENTRIES =====
async function loadEntries() {
    try {
        const response = await fetch(`${API_URL}/api/entries`);
        const newEntries = await response.json();

        // Only update if there are changes
        if (JSON.stringify(newEntries) !== JSON.stringify(entries)) {
            entries = newEntries;
            renderEntries();
        }
    } catch (error) {
        console.error('Failed to load entries:', error);
    }
}

// ===== RENDER ENTRIES =====
function renderEntries() {
    const container = document.getElementById('entriesContainer');
    const emptyState = document.getElementById('emptyState');

    if (entries.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Clear container
    container.innerHTML = '';

    // Render each entry
    entries.forEach((entry, index) => {
        const entryEl = createEntryElement(entry, index);
        container.appendChild(entryEl);
    });
}

// ===== CREATE ENTRY ELEMENT =====
function createEntryElement(entry, index) {
    const div = document.createElement('div');
    div.className = 'entry';
    div.style.animationDelay = `${index * 50}ms`;

    // Format timestamp
    const date = new Date(entry.timestamp);
    const formattedDate = formatDate(date);
    const duration = formatDuration(entry.duration);

    div.innerHTML = `
    <div class="entry-header">
      <button class="play-button" data-id="${entry.id}" aria-label="Play audio">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path class="play-icon" d="M8 5L19 12L8 19V5Z" fill="currentColor"/>
          <path class="pause-icon" d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" fill="currentColor" style="display: none;"/>
        </svg>
      </button>
      <div class="entry-info">
        <h2 class="entry-title">${escapeHtml(entry.title)}</h2>
        <div class="entry-meta">
          <span>${formattedDate}</span>
          ${duration ? `<span>${duration}</span>` : ''}
          <span>${entry.plays || 0} plays</span>
        </div>
      </div>
    </div>
    ${entry.description ? `<p class="entry-description">${escapeHtml(entry.description)}</p>` : ''}
    <audio class="audio-player" data-id="${entry.id}" src="${entry.audioUrl}" preload="metadata"></audio>
    <div class="comments-section">
      <div class="comments-header">Thoughts (${entry.comments?.length || 0})</div>
      <div class="comments-list" id="comments-${entry.id}">
        ${renderComments(entry.comments || [])}
      </div>
      <form class="comment-form" data-entry-id="${entry.id}">
        <input 
          type="text" 
          class="comment-input" 
          placeholder="Leave a thought..." 
          maxlength="500"
          required
        />
        <button type="submit" class="comment-submit">Post</button>
      </form>
    </div>
  `;

    // Add event listeners
    const playButton = div.querySelector('.play-button');
    playButton.addEventListener('click', () => togglePlay(entry.id));

    const audioElement = div.querySelector('.audio-player');
    audioElement.addEventListener('loadedmetadata', () => {
        // Update duration if not set
        if (!entry.duration && audioElement.duration) {
            entry.duration = Math.floor(audioElement.duration);
        }
    });

    audioElement.addEventListener('ended', () => {
        stopAudio();
    });

    const commentForm = div.querySelector('.comment-form');
    commentForm.addEventListener('submit', (e) => handleCommentSubmit(e, entry.id));

    return div;
}

// ===== RENDER COMMENTS =====
function renderComments(comments) {
    if (!comments || comments.length === 0) {
        return '<p style="color: var(--color-subtle); font-size: 0.875rem; font-style: italic;">No thoughts yet...</p>';
    }

    return comments.map(comment => `
    <div class="comment">
      <p class="comment-text">${escapeHtml(comment.text)}</p>
      <p class="comment-time">${formatDate(new Date(comment.timestamp))}</p>
    </div>
  `).join('');
}

// ===== AUDIO PLAYBACK =====
function togglePlay(entryId) {
    const audioElement = document.querySelector(`audio[data-id="${entryId}"]`);
    const playButton = document.querySelector(`button[data-id="${entryId}"]`);

    if (!audioElement || !playButton) return;

    // If clicking the same audio that's playing, pause it
    if (currentEntryId === entryId && currentAudio && !currentAudio.paused) {
        pauseAudio();
        return;
    }

    // If another audio is playing, stop it
    if (currentAudio && currentEntryId !== entryId) {
        stopAudio();
    }

    // Play the selected audio
    currentAudio = audioElement;
    currentEntryId = entryId;

    audioElement.play().then(() => {
        updatePlayButton(playButton, true);
        trackPlay(entryId);
    }).catch(error => {
        console.error('Playback error:', error);
    });
}

function pauseAudio() {
    if (currentAudio) {
        currentAudio.pause();
        const playButton = document.querySelector(`button[data-id="${currentEntryId}"]`);
        if (playButton) {
            updatePlayButton(playButton, false);
        }
    }
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        const playButton = document.querySelector(`button[data-id="${currentEntryId}"]`);
        if (playButton) {
            updatePlayButton(playButton, false);
        }
        currentAudio = null;
        currentEntryId = null;
    }
}

function updatePlayButton(button, isPlaying) {
    const playIcon = button.querySelector('.play-icon');
    const pauseIcon = button.querySelector('.pause-icon');

    if (isPlaying) {
        button.classList.add('playing');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        button.classList.remove('playing');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// ===== TRACK PLAY =====
async function trackPlay(entryId) {
    try {
        await fetch(`${API_URL}/api/play`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entryId })
        });
    } catch (error) {
        console.error('Failed to track play:', error);
    }
}

// ===== TRACK VISIT =====
async function trackVisit() {
    try {
        await fetch(`${API_URL}/api/visit`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Failed to track visit:', error);
    }
}

// ===== COMMENT SUBMISSION =====
async function handleCommentSubmit(e, entryId) {
    e.preventDefault();

    const form = e.target;
    const input = form.querySelector('.comment-input');
    const text = input.value.trim();

    if (!text) return;

    try {
        const response = await fetch(`${API_URL}/api/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entryId, text })
        });

        if (response.ok) {
            input.value = '';
            await loadEntries();
        }
    } catch (error) {
        console.error('Failed to post comment:', error);
    }
}

// ===== UTILITY FUNCTIONS =====
function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    const options = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== now.getFullYear()) {
        options.year = 'numeric';
    }

    return date.toLocaleDateString('en-US', options);
}

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
