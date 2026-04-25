import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let currentUser = null;
let userData = null;

// DOM
const habitForm = document.getElementById('habit-form');
const habitList = document.getElementById('habit-list');
const leaderboardList = document.getElementById('leaderboard-list');
const authModal = document.getElementById('auth-modal');
const shareModal = document.getElementById('share-modal');
const toast = document.getElementById('toast');

const rewards = ["Nice work!", "Consistency wins!", "Keep it up!", "Legendary!", "Gold status!"];
const quotes = ["Consistency is the key to success.", "Small steps lead to big changes.", "Habits define your future."];

// Date
function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Logic
function calculateStreak(habit) {
    if (!habit.completions.length) return 0;
    const today = getTodayStr();
    const d = new Date(); d.setDate(d.getDate() - 1);
    const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!habit.completions.includes(today) && !habit.completions.includes(yesterday)) return 0;

    let streak = 0;
    let curr = new Date();
    if (!habit.completions.includes(today)) curr.setDate(curr.getDate() - 1);

    while (true) {
        const ds = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
        if (habit.completions.includes(ds)) {
            streak++;
            curr.setDate(curr.getDate() - 1);
        } else {
            curr.setDate(curr.getDate() - 1);
            const bufferDs = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
            if (habit.completions.includes(bufferDs)) continue;
            else break;
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

async function saveAll() {
    if (currentUser) {
        const bestStreak = Math.max(0, ...habits.map(calculateStreak));
        await updateDoc(doc(db, "users", currentUser.uid), {
            habits: habits,
            bestStreak: bestStreak
        });
    } else {
        localStorage.setItem('habits', JSON.stringify(habits));
    }
}

function showToast(message) {
    toast.innerText = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

// Render
function renderHabits() {
    habitList.innerHTML = '';
    const today = getTodayStr();
    let completed = 0;

    habits.forEach(habit => {
        const isDone = habit.completions.includes(today);
        if (isDone) completed++;
        const streak = calculateStreak(habit);
        const milestone = getMilestone(streak);

        // Weekly Grid
        let gridHtml = '';
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            gridHtml += `<div class="grid-day"><span class="day-label">${["S", "M", "T", "W", "T", "F", "S"][d.getDay()]}</span><div class="day-circle ${habit.completions.includes(ds) ? 'done' : ''}"></div></div>`;
        }

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.innerHTML = `
            <div class="habit-main">
                <div class="habit-info">
                    <div class="emoji-box">${habit.emoji}</div>
                    <div>
                        <h3>${habit.name}</h3>
                        <div class="streak-info">
                            <span class="streak-count">🔥 ${streak} day streak</span>
                            ${milestone ? `<span class="milestone-badge">${milestone}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button class="toggle-btn ${isDone ? 'done' : ''}" data-id="${habit.id}">${isDone ? '✓' : ''}</button>
            </div>
            <div class="weekly-grid">${gridHtml}</div>
            <div class="habit-footer">
                <button class="share-btn" data-id="${habit.id}">Share Progress</button>
                <button class="delete-btn" data-id="${habit.id}">Delete</button>
            </div>
        `;
        habitList.appendChild(card);
    });

    document.getElementById('completed-count').innerText = completed;
    document.getElementById('total-count').innerText = habits.length;
    document.getElementById('progress-fill').style.width = (habits.length > 0 ? (completed / habits.length) * 100 : 0) + '%';
}

async function updateLeaderboard() {
    const q = query(collection(db, "users"), orderBy("bestStreak", "desc"), limit(5));
    try {
        const snapshot = await getDocs(q);
        leaderboardList.innerHTML = '';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'leader-item';
            item.innerHTML = `<div><span class="leader-rank">#${rank}</span> ${data.username}</div><div class="leader-streak">🔥 ${data.bestStreak}</div>`;
            leaderboardList.appendChild(item);
            rank++;
        });
    } catch(e) { console.error(e); }
}

// Sharing
function renderShareCard(habit) {
    const canvas = document.getElementById('share-canvas');
    const ctx = canvas.getContext('2d');
    const streak = calculateStreak(habit);
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    canvas.width = 1080; canvas.height = 1080;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 1080, 1080);
    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, '#ffcc00'); grad.addColorStop(1, '#ff6600');
    ctx.strokeStyle = grad; ctx.lineWidth = 40; ctx.strokeRect(20, 20, 1040, 1040);

    ctx.textAlign = 'center'; ctx.fillStyle = 'white';
    ctx.font = '200px serif'; ctx.fillText(habit.emoji, 540, 300);
    ctx.font = 'bold 80px Inter, sans-serif'; ctx.fillText(habit.name.toUpperCase(), 540, 450);
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 120px Inter, sans-serif'; ctx.fillText(`${streak} DAY STREAK`, 540, 620);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'italic 40px Inter, sans-serif'; ctx.fillText(`"${quote}"`, 540, 750);

    const startX = 540 - (3 * 80);
    for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        ctx.fillStyle = habit.completions.includes(ds) ? '#00c851' : '#333';
        ctx.beginPath(); ctx.arc(startX + (i * 80), 850, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.font = '20px Inter, sans-serif';
        ctx.fillText(["S", "M", "T", "W", "T", "F", "S"][d.getDay()], startX + (i * 80), 910);
    }

    ctx.globalAlpha = 0.5; ctx.font = '30px Inter, sans-serif'; ctx.fillText('GOLDEN HABITS 2.0', 540, 1020); ctx.globalAlpha = 1.0;
    const preview = document.getElementById('card-preview-container');
    preview.innerHTML = '';
    const img = new Image(); img.src = canvas.toDataURL('image/png'); preview.appendChild(img);
}

// Events
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        document.getElementById('user-status').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('profile-name').innerText = user.email.split('@')[0];
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) { habits = docSnap.data().habits || []; renderHabits(); }
    } else {
        document.getElementById('user-status').classList.remove('hidden');
        document.getElementById('user-profile').classList.add('hidden');
        habits = JSON.parse(localStorage.getItem('habits')) || []; renderHabits();
    }
    updateLeaderboard();
});

document.getElementById('signup-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const username = document.getElementById('signup-username').value;
    try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", res.user.uid), { userId: res.user.uid, username, habits, bestStreak: 0, totalScore: 0 });
        authModal.classList.add('hidden');
    } catch (err) { alert(err.message); }
};

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
        authModal.classList.add('hidden');
    } catch (err) { alert(err.message); }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

habitForm.onsubmit = async (e) => {
    e.preventDefault();
    habits.push({ id: Date.now().toString(), name: document.getElementById('habit-name').value, emoji: document.getElementById('habit-emoji').value || '🔥', completions: [] });
    habitForm.reset(); habitForm.classList.add('collapsed'); renderHabits(); await saveAll();
};

habitList.onclick = async (e) => {
    const id = e.target.dataset.id; if (!id) return;
    const habit = habits.find(h => h.id === id);
    if (e.target.classList.contains('toggle-btn')) {
        const today = getTodayStr();
        const idx = habit.completions.indexOf(today);
        if (idx === -1) { habit.completions.push(today); showToast(rewards[Math.floor(Math.random() * rewards.length)]); }
        else habit.completions.splice(idx, 1);
        renderHabits(); await saveAll();
    } else if (e.target.classList.contains('delete-btn')) {
        if (confirm("Delete?")) { habits = habits.filter(h => h.id !== id); renderHabits(); await saveAll(); }
    } else if (e.target.classList.contains('share-btn')) {
        renderShareCard(habit); shareModal.classList.remove('hidden');
    }
};

document.getElementById('download-btn').onclick = () => {
    const link = document.createElement('a'); link.download = 'habit.png'; link.href = document.getElementById('share-canvas').toDataURL(); link.click();
};

document.getElementById('auth-trigger-btn').onclick = () => authModal.classList.remove('hidden');
document.getElementById('close-auth-btn').onclick = () => authModal.classList.add('hidden');
document.getElementById('close-share-btn').onclick = () => shareModal.classList.add('hidden');
document.getElementById('show-signup').onclick = () => { document.getElementById('login-form-container').classList.add('hidden'); document.getElementById('signup-form-container').classList.remove('hidden'); };
document.getElementById('show-login').onclick = () => { document.getElementById('login-form-container').classList.remove('hidden'); document.getElementById('signup-form-container').classList.add('hidden'); };
document.getElementById('toggle-form-btn').onclick = () => { habitForm.classList.toggle('collapsed'); document.getElementById('toggle-form-btn').innerText = habitForm.classList.contains('collapsed') ? '+' : '−'; };
document.querySelectorAll('.suggest-btn').forEach(btn => btn.onclick = () => { document.getElementById('habit-name').value = btn.dataset.name; document.getElementById('habit-emoji').value = btn.dataset.emoji; });

renderHabits();
updateLeaderboard();
