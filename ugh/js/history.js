import { state } from './state.js';
import { elements } from './ui.js';

const STORAGE_KEY = 'emom_sessions';

export function saveSession(rounds) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    history.push({ date: new Date().toISOString(), rounds: rounds });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-50)));
}

export function renderHistory() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (history.length === 0) {
        elements.historyList.innerHTML = '<div style="text-align:center; opacity:0.5; margin-top:20px;">NO SESSIONS</div>';
    } else {
        elements.historyList.innerHTML = history.slice().reverse().map((s, idx) => {
            const d = new Date(s.date);
            const originalIdx = history.length - 1 - idx; // Reverse index
            return `<div class="history-item">
                <div class="history-item-content">
                    <span>${d.toLocaleDateString()} <small>${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small></span>
                    <strong>${s.rounds} RNDS</strong>
                </div>
                <button class="history-delete" data-idx="${originalIdx}">DEL</button>
            </div>`;
        }).join('');

        // Add delete listeners
        document.querySelectorAll('.history-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-idx'));
                showDeleteConfirmation(idx);
            });
        });
    }
}

export function showDeleteConfirmation(idx) {
    state.pendingDeleteIdx = idx;
    elements.deleteModal.style.display = 'flex';
}

export function deleteSession(idx) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    history.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory();
}

export async function exportHistory() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (history.length === 0) {
        alert('No sessions to export');
        return;
    }

    // Format as markdown list
    const markdown = history.map(s => {
        const d = new Date(s.date);
        const dateStr = d.getFullYear()
            + String(d.getMonth() + 1).padStart(2, '0')
            + String(d.getDate()).padStart(2, '0');
        const timeStr = String(d.getHours()).padStart(2, '0')
            + ':' + String(d.getMinutes()).padStart(2, '0');
        return `- ${dateStr} @ ${timeStr}: ${s.rounds} rounds`;
    }).join('\n');

    // Try Web Share API first (better for mobile)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Workout History',
                text: markdown
            });
        } catch (err) {
            // User cancelled or share failed, ignore
            if (err.name !== 'AbortError') console.log('Share failed:', err);
        }
    } else {
        // Fallback: Download as file
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workout-history.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
