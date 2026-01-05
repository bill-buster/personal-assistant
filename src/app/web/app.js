/* global window, document, fetch, console, alert */
/**
 * Assistant Dashboard App
 */

const API_BASE = window.location.origin;

// DOM Elements
const statusEl = document.getElementById('status');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const memoryForm = document.getElementById('memory-form');
const memoryInput = document.getElementById('memory-input');
const memorySearch = document.getElementById('memory-search');
const searchBtn = document.getElementById('search-btn');
const memoryList = document.getElementById('memory-list');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkHealth();
    await loadTasks();
});

// Health check
async function checkHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
            statusEl.textContent = 'Connected';
            statusEl.classList.add('connected');
        }
    } catch {
        statusEl.textContent = 'Disconnected';
    }
}

// Tasks
async function loadTasks() {
    try {
        const res = await fetch(`${API_BASE}/api/tasks`);
        const data = await res.json();

        if (data.ok && data.result?.tasks) {
            renderTasks(data.result.tasks);
        }
    } catch (err) {
        console.error('Failed to load tasks:', err);
    }
}

function renderTasks(tasks) {
    if (!tasks.length) {
        taskList.innerHTML = '<li class="empty">No tasks yet</li>';
        return;
    }

    taskList.innerHTML = tasks.map(task => `
        <li class="${task.done ? 'done' : ''}" data-id="${task.id}">
            <span>${escapeHtml(task.text)}</span>
            ${!task.done ? `<button onclick="completeTask(${task.id})">Done</button>` : ''}
        </li>
    `).join('');
}

taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`${API_BASE}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (res.ok) {
            taskInput.value = '';
            await loadTasks();
        }
    } catch (err) {
        console.error('Failed to add task:', err);
    }
});

async function completeTask(id) {
    try {
        await fetch(`${API_BASE}/api/tasks/done`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        await loadTasks();
    } catch (err) {
        console.error('Failed to complete task:', err);
    }
}

// Memory
memoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = memoryInput.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`${API_BASE}/api/memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (res.ok) {
            memoryInput.value = '';
            alert('Memory stored!');
        }
    } catch (err) {
        console.error('Failed to store memory:', err);
    }
});

searchBtn.addEventListener('click', async () => {
    const query = memorySearch.value.trim();
    if (!query) return;

    try {
        const res = await fetch(`${API_BASE}/api/memory?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.ok && data.result?.entries) {
            renderMemory(data.result.entries);
        }
    } catch (err) {
        console.error('Failed to search memory:', err);
    }
});

memorySearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

function renderMemory(entries) {
    if (!entries.length) {
        memoryList.innerHTML = '<li class="empty">No matches found</li>';
        return;
    }

    memoryList.innerHTML = entries.map(entry => `
        <li class="memory-item">
            <span>${escapeHtml(entry.text)}</span>
            <span class="time">${formatTime(entry.ts)}</span>
        </li>
    `).join('');
}

// Utilities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
}

// Expose to global scope
window.completeTask = completeTask;
