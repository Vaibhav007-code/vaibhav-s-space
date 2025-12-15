// ============================================
// VAIBHAV'S SPACE — ADMIN PANEL
// Serverless admin with setup & reset
// ============================================

const API_URL = window.location.origin;
let adminPassword = '';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if admin exists
        const response = await fetch(`${API_URL}/api/admin/check`);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        const { isSetup, securityQuestion } = data;

        if (!isSetup) {
            showSetup();
        } else {
            // Check if logged in
            const savedPassword = sessionStorage.getItem('adminPassword');
            if (savedPassword) {
                adminPassword = savedPassword;
                if (await verifyPassword()) {
                    showAdminPanel();
                } else {
                    sessionStorage.removeItem('adminPassword');
                    showLogin(securityQuestion);
                }
            } else {
                showLogin(securityQuestion);
            }
        }
    } catch (error) {
        console.error('Init error:', error);
        // If API fails, assume we need to login or setup manually
        // Just show login as fail-safe
        document.getElementById('adminLogin').innerHTML = `
        <div class="login-card">
            <h2>Connection Error</h2>
            <p class="error-message">Could not connect to server.</p>
            <button onclick="window.location.reload()" class="btn-primary" style="margin-top:1rem">Retry</button>
        </div>
    `;
    }
});

// ===== SETUP =====
async function showSetup() {
    document.getElementById('adminLogin').innerHTML = `
    <div class="login-card">
      <h2>Welcome! 🎙️</h2>
      <p class="login-subtitle">Setup your admin account</p>
      <form id="setupForm">
        <input 
          type="password" 
          id="passwordInput" 
          placeholder="Create password" 
          required
          minlength="6"
        />
        <input 
          type="text" 
          id="questionInput" 
          placeholder="Security question" 
          required
        />
        <input 
          type="text" 
          id="answerInput" 
          placeholder="Security answer" 
          required
        />
        <button type="submit" class="btn-primary">Setup</button>
      </form>
      <p class="error-message" id="setupError"></p>
    </div>
  `;

    document.getElementById('setupForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('passwordInput').value;
        const securityQuestion = document.getElementById('questionInput').value;
        const securityAnswer = document.getElementById('answerInput').value;

        try {
            const response = await fetch(`${API_URL}/api/admin/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, securityQuestion, securityAnswer })
            });

            if (response.ok) {
                adminPassword = password;
                sessionStorage.setItem('adminPassword', password);
                showAdminPanel();
            } else {
                document.getElementById('setupError').textContent = 'Setup failed';
            }
        } catch (error) {
            document.getElementById('setupError').textContent = 'Setup error';
        }
    });
}

// ===== LOGIN =====
async function showLogin(securityQuestion) {
    document.getElementById('adminLogin').innerHTML = `
    <div class="login-card">
      <h2>Admin Access</h2>
      <p class="login-subtitle">Enter your password</p>
      <form id="loginForm">
        <input 
          type="password" 
          id="passwordInput" 
          placeholder="Password" 
          required
        />
        <button type="submit" class="btn-primary">Login</button>
      </form>
      <button id="forgotBtn" class="btn-secondary" style="margin-top: 1rem;">Forgot Password?</button>
      <p class="error-message" id="loginError"></p>
    </div>
  `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('passwordInput').value;

        try {
            const response = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                adminPassword = password;
                sessionStorage.setItem('adminPassword', password);
                showAdminPanel();
            } else {
                document.getElementById('loginError').textContent = 'Invalid password';
            }
        } catch (error) {
            document.getElementById('loginError').textContent = 'Login error';
        }
    });

    document.getElementById('forgotBtn').addEventListener('click', () => {
        showReset(securityQuestion);
    });
}

// ===== PASSWORD RESET =====
async function showReset(securityQuestion) {
    document.getElementById('adminLogin').innerHTML = `
    <div class="login-card">
      <h2>Reset Password</h2>
      <p class="login-subtitle">${securityQuestion}</p>
      <form id="resetForm">
        <input 
          type="text" 
          id="answerInput" 
          placeholder="Your answer" 
          required
        />
        <input 
          type="password" 
          id="newPasswordInput" 
          placeholder="New password" 
          required
          minlength="6"
        />
        <button type="submit" class="btn-primary">Reset</button>
      </form>
      <button id="backBtn" class="btn-secondary" style="margin-top: 1rem;">Back</button>
      <p class="error-message" id="resetError"></p>
    </div>
  `;

    document.getElementById('resetForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const securityAnswer = document.getElementById('answerInput').value;
        const newPassword = document.getElementById('newPasswordInput').value;

        try {
            const response = await fetch(`${API_URL}/api/admin/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ securityAnswer, newPassword })
            });

            if (response.ok) {
                adminPassword = newPassword;
                sessionStorage.setItem('adminPassword', newPassword);
                showAdminPanel();
            } else {
                document.getElementById('resetError').textContent = 'Invalid answer';
            }
        } catch (error) {
            document.getElementById('resetError').textContent = 'Reset error';
        }
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.reload();
    });
}

// ===== VERIFY PASSWORD =====
async function verifyPassword() {
    try {
        const response = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword })
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// ===== SHOW ADMIN PANEL =====
function showAdminPanel() {
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');

    loadAnalytics();
    loadManageEntries();

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('adminPassword');
        adminPassword = '';
        window.location.reload();
    });

    initUploadForm();
}

// ===== UPLOAD FORM =====
function initUploadForm() {
    const fileInput = document.getElementById('audioFile');
    const fileLabel = document.getElementById('fileLabel');
    const form = document.getElementById('uploadForm');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileLabel.textContent = file.name;
        } else {
            fileLabel.textContent = 'Choose audio file';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        const title = document.getElementById('titleInput').value.trim();
        const description = document.getElementById('descriptionInput').value.trim();

        if (!file || !title) {
            alert('Please select an audio file and provide a title');
            return;
        }

        const duration = await getAudioDuration(file);

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('duration', duration);

        const progressSection = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const uploadBtn = document.getElementById('uploadBtn');

        uploadBtn.disabled = true;
        progressSection.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = 'Uploading...';

        try {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressFill.style.width = percentComplete + '%';
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    progressText.textContent = 'Published!';

                    setTimeout(() => {
                        form.reset();
                        fileLabel.textContent = 'Choose audio file';
                        progressSection.classList.add('hidden');
                        uploadBtn.disabled = false;
                        loadAnalytics();
                        loadManageEntries();
                    }, 1500);
                } else {
                    progressText.textContent = 'Upload failed';
                    uploadBtn.disabled = false;
                    setTimeout(() => progressSection.classList.add('hidden'), 2000);
                }
            });

            xhr.addEventListener('error', () => {
                progressText.textContent = 'Upload failed';
                uploadBtn.disabled = false;
                setTimeout(() => progressSection.classList.add('hidden'), 2000);
            });

            xhr.open('POST', `${API_URL}/api/upload`);
            xhr.setRequestHeader('X-Admin-Password', adminPassword);
            xhr.send(formData);

        } catch (error) {
            console.error('Upload error:', error);
            progressText.textContent = 'Upload failed';
            uploadBtn.disabled = false;
            setTimeout(() => progressSection.classList.add('hidden'), 2000);
        }
    });
}

// ===== GET AUDIO DURATION =====
function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            resolve(Math.floor(audio.duration));
            URL.revokeObjectURL(audio.src);
        });
        audio.addEventListener('error', () => {
            resolve(0);
            URL.revokeObjectURL(audio.src);
        });
        audio.src = URL.createObjectURL(file);
    });
}

// ===== LOAD ANALYTICS =====
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/api/analytics`, {
            headers: { 'X-Admin-Password': adminPassword }
        });

        if (response.ok) {
            const data = await response.json();

            document.getElementById('totalEntries').textContent = data.totalEntries || 0;
            document.getElementById('totalPlays').textContent = data.totalPlays || 0;

            const today = new Date().toISOString().split('T')[0];
            const todayVisits = data.dailyVisits[today] || 0;
            document.getElementById('todayVisits').textContent = todayVisits;
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

// ===== LOAD MANAGE ENTRIES =====
async function loadManageEntries() {
    try {
        const response = await fetch(`${API_URL}/api/entries`);
        const entries = await response.json();

        const container = document.getElementById('manageEntries');

        if (entries.length === 0) {
            container.innerHTML = '<p style="color: var(--color-subtle); text-align: center;">No entries yet</p>';
            return;
        }

        container.innerHTML = entries.map(entry => {
            const date = new Date(entry.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            return `
        <div class="manage-entry">
          <div class="manage-entry-info">
            <h3>${escapeHtml(entry.title)}</h3>
            <div class="manage-entry-meta">
              ${formattedDate} • ${entry.plays || 0} plays • ${entry.comments?.length || 0} comments
            </div>
          </div>
          <button class="btn-delete" data-id="${entry.id}">Delete</button>
        </div>
      `;
        }).join('');

        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
        });

    } catch (error) {
        console.error('Failed to load entries:', error);
    }
}

// ===== DELETE ENTRY =====
async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': adminPassword
            },
            body: JSON.stringify({ entryId })
        });

        if (response.ok) {
            loadAnalytics();
            loadManageEntries();
        } else {
            alert('Failed to delete entry');
        }
    } catch (error) {
        console.error('Failed to delete entry:', error);
        alert('Failed to delete entry');
    }
}

// ===== UTILITY =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
