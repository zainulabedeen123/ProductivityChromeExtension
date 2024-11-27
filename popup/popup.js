// DOM elements
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const timerModeDisplay = document.getElementById('timerMode');
const completedCountDisplay = document.getElementById('completedCount');
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Default timer state
const DEFAULT_STATE = {
    timeLeft: 25 * 60,
    isRunning: false,
    isWorkMode: true,
    completedPomodoros: 0
};

// Load saved data
chrome.storage.local.get(['todos'], (result) => {
    if (result.todos) {
        result.todos.forEach(todo => addTodoToList(todo.text, todo.completed));
    }
});

// Get initial timer state
const initializeTimer = () => {
    try {
        chrome.runtime.sendMessage({ type: 'getTimerState' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Connection error:', chrome.runtime.lastError.message);
                updateTimerDisplay(DEFAULT_STATE);
                return;
            }
            updateTimerDisplay(response || DEFAULT_STATE);
        });
    } catch (error) {
        console.log('Error getting timer state:', error);
        updateTimerDisplay(DEFAULT_STATE);
    }
};

// Format time to MM:SS
const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return {
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0')
    };
};

// Update timer display
const updateTimerDisplay = (state) => {
    if (!state) {
        state = DEFAULT_STATE;
    }
    
    try {
        const { minutes, seconds } = formatTime(state.timeLeft || DEFAULT_STATE.timeLeft);
        minutesDisplay.textContent = minutes;
        secondsDisplay.textContent = seconds;
        timerModeDisplay.textContent = state.isWorkMode ? 'Work Mode' : 'Break Mode';
        startBtn.disabled = state.isRunning;
        stopBtn.disabled = !state.isRunning;
        if (state.completedPomodoros !== undefined) {
            completedCountDisplay.textContent = state.completedPomodoros;
        }
    } catch (error) {
        console.log('Error updating display:', error);
        const { minutes, seconds } = formatTime(DEFAULT_STATE.timeLeft);
        minutesDisplay.textContent = minutes;
        secondsDisplay.textContent = seconds;
        timerModeDisplay.textContent = 'Work Mode';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
};

// Timer control functions
const startTimer = () => {
    try {
        chrome.runtime.sendMessage({ type: 'startTimer' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Connection error:', chrome.runtime.lastError.message);
                return;
            }
        });
    } catch (error) {
        console.log('Error starting timer:', error);
    }
};

const stopTimer = () => {
    try {
        chrome.runtime.sendMessage({ type: 'stopTimer' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Connection error:', chrome.runtime.lastError.message);
                return;
            }
        });
    } catch (error) {
        console.log('Error stopping timer:', error);
    }
};

// Listen for timer updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'timerUpdate') {
        updateTimerDisplay(message);
    }
    return true;
});

// Todo list functions
const saveTodos = () => {
    const todos = Array.from(todoList.children).map(item => ({
        text: item.querySelector('.todo-text').textContent,
        completed: item.querySelector('.todo-checkbox').classList.contains('checked')
    }));
    chrome.storage.local.set({ todos });
};

const addTodoToList = (text, completed = false) => {
    const todoItem = document.createElement('div');
    todoItem.className = 'todo-item';
    todoItem.innerHTML = `
        <div class="todo-checkbox ${completed ? 'checked' : ''}"></div>
        <span class="todo-text ${completed ? 'completed' : ''}">${text}</span>
        <span class="todo-delete">×</span>
    `;

    const checkbox = todoItem.querySelector('.todo-checkbox');
    const todoText = todoItem.querySelector('.todo-text');
    const deleteBtn = todoItem.querySelector('.todo-delete');

    checkbox.addEventListener('click', () => {
        checkbox.classList.toggle('checked');
        todoText.classList.toggle('completed');
        saveTodos();
    });

    deleteBtn.addEventListener('click', () => {
        todoItem.remove();
        saveTodos();
    });

    todoList.appendChild(todoItem);
    saveTodos();
};

const handleAddTodo = () => {
    const text = todoInput.value.trim();
    if (text) {
        addTodoToList(text);
        todoInput.value = '';
    }
};

// Tab switching
const switchTab = (tabId) => {
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabContents.forEach(content => {
        content.classList.toggle('hidden', content.id !== `${tabId}Tab`);
    });
};

// Event listeners
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
addTodoBtn.addEventListener('click', handleAddTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTodo();
});
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Initialize timer on popup open
initializeTimer(); 