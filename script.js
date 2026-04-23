// Data Management
let habits = JSON.parse(localStorage.getItem('habits')) || [];

const habitForm = document.getElementById('habit-form');
const habitList = document.getElementById('habit-list');
const habitNameInput = document.getElementById('habit-name');
const habitEmojiInput = document.getElementById('habit-emoji');

// Date Helper
function getTodayStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
}

function addHabit(name, emoji) {
    const newHabit = {
        id: Date.now().toString(),
        name,
        emoji,
        completions: [],
        createdAt: getTodayStr()
    };
    habits.push(newHabit);
    saveHabits();
    renderHabits();
}

function deleteHabit(id) {
    habits = habits.filter(h => h.id !== id);
    saveHabits();
    renderHabits();
}

function toggleCompletion(id) {
    const today = getTodayStr();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const index = habit.completions.indexOf(today);
    if (index === -1) {
        habit.completions.push(today);
    } else {
        habit.completions.splice(index, 1);
    }
    saveHabits();
    renderHabits();
}

// UI Rendering
function renderHabits() {
    habitList.innerHTML = '';
    const today = getTodayStr();

    habits.forEach(habit => {
        const isDoneToday = habit.completions.includes(today);
        const streak = calculateStreak(habit);

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.innerHTML = `
            <div class="habit-info">
                <div class="emoji-box">${habit.emoji}</div>
                <div class="habit-details">
                    <h3>${habit.name}</h3>
                    <p class="streak-count">🔥 ${streak} day streak</p>
                    <button class="share-btn" onclick="openShareModal('${habit.id}')">Share Progress</button>
                </div>
            </div>
            <div class="habit-actions">
                <button class="toggle-btn ${isDoneToday ? 'done' : ''}" onclick="toggleCompletion('${habit.id}')">
                    ${isDoneToday ? '✓' : ''}
                </button>
                <button class="delete-btn" onclick="deleteHabit('${habit.id}')">Delete</button>
            </div>
        `;
        habitList.appendChild(card);
    });
}

// Streak Calculation
function calculateStreak(habit) {
    if (!habit.completions.length) return 0;

    const today = getTodayStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (!habit.completions.includes(today) && !habit.completions.includes(yesterdayStr)) {
        return 0;
    }

    let streak = 0;
    let curr = new Date();

    if (!habit.completions.includes(today)) {
        curr.setDate(curr.getDate() - 1);
    }

    while (true) {
        const year = curr.getFullYear();
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        if (habit.completions.includes(dateStr)) {
            streak++;
            curr.setDate(curr.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

// Sharing Logic
const shareModal = document.getElementById('share-modal');
const closeBtn = document.querySelector('.close-btn');
const downloadBtn = document.getElementById('download-btn');
const canvas = document.getElementById('share-canvas');
const ctx = canvas.getContext('2d');

function openShareModal(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    renderShareCard(habit);
    shareModal.classList.remove('hidden');
}

closeBtn.onclick = () => shareModal.classList.add('hidden');
window.onclick = (event) => {
    if (event.target == shareModal) shareModal.classList.add('hidden');
};

function renderShareCard(habit) {
    const streak = calculateStreak(habit);
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        last7Days.push(`${year}-${month}-${day}`);
    }
    const completedCount = habit.completions.filter(d => last7Days.includes(d)).length;

    canvas.width = 1080;
    canvas.height = 1080;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, '#ffcc00');
    grad.addColorStop(1, '#ff6600');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, 1040, 1040);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    ctx.font = '200px serif';
    ctx.fillText(habit.emoji, 540, 350);

    ctx.font = 'bold 80px Inter, sans-serif';
    ctx.fillText(habit.name.toUpperCase(), 540, 500);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 120px Inter, sans-serif';
    ctx.fillText(`${streak} DAY STREAK`, 540, 650);

    ctx.fillStyle = 'white';
    ctx.font = '40px Inter, sans-serif';
    ctx.fillText(`${completedCount} / 7 DAYS COMPLETED THIS WEEK`, 540, 750);

    ctx.globalAlpha = 0.5;
    ctx.font = '30px Inter, sans-serif';
    ctx.fillText('GOLDEN HABITS 2.0', 540, 1000);
    ctx.globalAlpha = 1.0;

    const previewContainer = document.getElementById('card-preview-container');
    previewContainer.innerHTML = '';
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    previewContainer.appendChild(img);
}

downloadBtn.onclick = () => {
    const link = document.createElement('a');
    link.download = 'habit-progress.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
};

// Event Listeners
habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = habitNameInput.value.trim();
    const emoji = habitEmojiInput.value.trim() || '🔥';
    if (name) {
        addHabit(name, emoji);
        habitForm.reset();
    }
});

// Initial Render
renderHabits();
