// Data Management
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || { reminders: false };

const habitForm = document.getElementById('habit-form');
const habitList = document.getElementById('habit-list');
const habitNameInput = document.getElementById('habit-name');
const habitEmojiInput = document.getElementById('habit-emoji');
const toggleFormBtn = document.getElementById('toggle-form-btn');
const reminderToggle = document.getElementById('reminder-toggle');
const reminderBanner = document.getElementById('reminder-banner');
const toast = document.getElementById('toast');

const rewards = ["Nice work!", "Consistency wins!", "Keep it up!", "You're doing great!", "Unstoppable!", "Legendary!", "Gold status!"];
const quotes = [
    "Consistency is the key to success.",
    "Small steps lead to big changes.",
    "Don't stop until you're proud.",
    "Your future self will thank you.",
    "Habits define your future."
];

// Date Helper
function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
}

function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Streak Protection & Logic
function calculateStreak(habit) {
    if (!habit.completions.length) return 0;

    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    // Streak protection: if not done today or yesterday, streak is lost.
    if (!habit.completions.includes(today) && !habit.completions.includes(yesterday)) {
        return 0;
    }

    let streak = 0;
    let curr = new Date();

    // If not done today, we still count from yesterday backwards
    if (!habit.completions.includes(today)) {
        curr.setDate(curr.getDate() - 1);
    }

    while (true) {
        const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
        if (habit.completions.includes(dateStr)) {
            streak++;
            curr.setDate(curr.getDate() - 1);
        } else {
            // Buffer: If we hit a missing day, check if the day BEFORE that was done.
            // If yes, this was a "protected" miss. But streak protection usually means
            // the streak doesn't RESET, but it might not increment.
            // Requirement says: "Allow 1 miss day buffer. Do not reset streak immediately."
            // We'll allow one gap in the sequence.
            curr.setDate(curr.getDate() - 1);
            const checkBufferStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
            if (habit.completions.includes(checkBufferStr)) {
                // Keep going, but don't increment streak for the missed day
                continue;
            } else {
                break;
            }
        }
    }
    return streak;
}

function getMilestone(streak) {
    if (streak >= 30) return "Unstoppable";
    if (streak >= 7) return "On Fire";
    if (streak >= 3) return "Good Start";
    return null;
}

// UI Rendering
function renderHabits() {
    habitList.innerHTML = '';
    const today = getTodayStr();
    let completedToday = 0;

    habits.forEach(habit => {
        const isDoneToday = habit.completions.includes(today);
        if (isDoneToday) completedToday++;

        const streak = calculateStreak(habit);
        const milestone = getMilestone(streak);

        const card = document.createElement('div');
        card.className = 'habit-card';

        // Generate Weekly Grid
        let gridHtml = '';
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const isDone = habit.completions.includes(dateStr);
            const dayInitial = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
            gridHtml += `
                <div class="grid-day">
                    <span class="day-label">${dayInitial}</span>
                    <div class="day-circle ${isDone ? 'done' : ''}"></div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="habit-main">
                <div class="habit-info">
                    <div class="emoji-box">${habit.emoji}</div>
                    <div class="habit-details">
                        <h3>${habit.name}</h3>
                        <div class="streak-info">
                            <span class="streak-count">🔥 ${streak} day streak</span>
                            ${milestone ? `<span class="milestone-badge">${milestone}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button class="toggle-btn ${isDoneToday ? 'done' : ''}" onclick="toggleCompletion('${habit.id}')">
                    ${isDoneToday ? '✓' : ''}
                </button>
            </div>
            <div class="weekly-grid">${gridHtml}</div>
            <div class="habit-footer">
                <button class="share-btn" onclick="openShareModal('${habit.id}')">Share Progress</button>
                <button class="delete-btn" onclick="deleteHabit('${habit.id}')">Delete</button>
            </div>
        `;
        habitList.appendChild(card);
    });

    updateSummary(completedToday, habits.length);
}

function updateSummary(completed, total) {
    document.getElementById('completed-count').innerText = completed;
    document.getElementById('total-count').innerText = total;
    const percent = total > 0 ? (completed / total) * 100 : 0;
    document.getElementById('progress-fill').style.width = percent + '%';
}

function showToast(message) {
    toast.innerText = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

// Actions
function toggleCompletion(id) {
    const today = getTodayStr();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const index = habit.completions.indexOf(today);
    const btn = document.querySelector(`button[onclick="toggleCompletion('${id}')"]`);

    if (index === -1) {
        habit.completions.push(today);
        showToast(rewards[Math.floor(Math.random() * rewards.length)]);
        if (btn) btn.classList.add('done-pop');
    } else {
        habit.completions.splice(index, 1);
        if (btn) btn.classList.remove('done-pop');
    }
    saveHabits();
    setTimeout(renderHabits, 300); // Small delay to let animation finish
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
    if (confirm("Delete this habit?")) {
        habits = habits.filter(h => h.id !== id);
        saveHabits();
        renderHabits();
    }
}

// Sharing Logic (Simplified for now, will be updated in next step)
function openShareModal(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    renderShareCard(habit);
    document.getElementById('share-modal').classList.remove('hidden');
}

// Event Listeners
toggleFormBtn.onclick = () => {
    habitForm.classList.toggle('collapsed');
    toggleFormBtn.innerText = habitForm.classList.contains('collapsed') ? '+' : '−';
};

habitForm.onsubmit = (e) => {
    e.preventDefault();
    const name = habitNameInput.value.trim();
    const emoji = habitEmojiInput.value.trim() || '🔥';
    if (name) {
        addHabit(name, emoji);
        habitForm.reset();
        habitForm.classList.add('collapsed');
        toggleFormBtn.innerText = '+';
    }
};

document.querySelectorAll('.suggest-btn').forEach(btn => {
    btn.onclick = () => {
        habitNameInput.value = btn.dataset.name;
        habitEmojiInput.value = btn.dataset.emoji;
    };
});

reminderToggle.onchange = (e) => {
    settings.reminders = e.target.checked;
    saveSettings();
    updateReminderBanner();
};

function updateReminderBanner() {
    if (settings.reminders) {
        reminderBanner.classList.remove('hidden');
    } else {
        reminderBanner.classList.add('hidden');
    }
}

document.querySelector('.close-btn').onclick = () => {
    document.getElementById('share-modal').classList.add('hidden');
};

// Placeholder for Canvas Logic (Step 5)
function renderShareCard(habit) {
    const canvas = document.getElementById('share-canvas');
    const ctx = canvas.getContext('2d');
    const streak = calculateStreak(habit);
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    canvas.width = 1080;
    canvas.height = 1080;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 1080, 1080);

    // Gradient Border
    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, '#ffcc00');
    grad.addColorStop(1, '#ff6600');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, 1040, 1040);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';

    // Emoji
    ctx.font = '200px serif';
    ctx.fillText(habit.emoji, 540, 300);

    // Name
    ctx.font = 'bold 80px Inter, sans-serif';
    ctx.fillText(habit.name.toUpperCase(), 540, 450);

    // Streak
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 120px Inter, sans-serif';
    ctx.fillText(`${streak} DAY STREAK`, 540, 620);

    // Quote
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'italic 40px Inter, sans-serif';
    ctx.fillText(`"${quote}"`, 540, 750);

    // Weekly Grid Drawing
    const gridY = 850;
    const startX = 540 - (3 * 80);
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isDone = habit.completions.includes(dateStr);

        ctx.fillStyle = isDone ? '#00c851' : '#333';
        ctx.beginPath();
        ctx.arc(startX + (i * 80), gridY, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '20px Inter, sans-serif';
        const dayLabel = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
        ctx.fillText(dayLabel, startX + (i * 80), gridY + 60);
    }

    // Watermark
    ctx.globalAlpha = 0.5;
    ctx.font = '30px Inter, sans-serif';
    ctx.fillText('GOLDEN HABITS 2.0', 540, 1020);
    ctx.globalAlpha = 1.0;

    const preview = document.getElementById('card-preview-container');
    preview.innerHTML = '';
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    preview.appendChild(img);
}

document.getElementById('download-btn').onclick = () => {
    const canvas = document.getElementById('share-canvas');
    const link = document.createElement('a');
    link.download = 'habit-achievement.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
};

// Init
reminderToggle.checked = settings.reminders;
updateReminderBanner();
renderHabits();
