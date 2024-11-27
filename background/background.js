// Timer configuration
const WORK_TIME = 25 * 60; // 25 minutes in seconds
const BREAK_TIME = 5 * 60; // 5 minutes in seconds

// Timer state
let timerState = {
    timeLeft: WORK_TIME,
    isRunning: false,
    isWorkMode: true,
    completedPomodoros: 0,
    timerInterval: null,
    startTime: null
};

// Reset completed pomodoros at midnight
const resetCompletedPomodoros = () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        timerState.completedPomodoros = 0;
        chrome.storage.local.set({ completedPomodoros: 0 });
    }
};

// Check every minute for midnight reset
setInterval(resetCompletedPomodoros, 60000);

// Send notification
const sendNotification = (title, message) => {
    try {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '../assets/icon-128.png',
            title: title,
            message: message
        });
    } catch (error) {
        console.log('Error sending notification:', error);
    }
};

// Broadcast timer update to all open popups
const broadcastTimerUpdate = () => {
    try {
        chrome.runtime.sendMessage({
            type: 'timerUpdate',
            timeLeft: timerState.timeLeft,
            isRunning: timerState.isRunning,
            isWorkMode: timerState.isWorkMode,
            completedPomodoros: timerState.completedPomodoros
        });
    } catch (error) {
        console.log('Error broadcasting timer update:', error);
    }
};

// Timer control functions
const startTimer = () => {
    if (!timerState.isRunning) {
        timerState.isRunning = true;
        timerState.startTime = Date.now() - ((timerState.isWorkMode ? WORK_TIME : BREAK_TIME) - timerState.timeLeft) * 1000;
        
        timerState.timerInterval = setInterval(() => {
            try {
                const currentTime = Date.now();
                const elapsedSeconds = Math.floor((currentTime - timerState.startTime) / 1000);
                const totalTime = timerState.isWorkMode ? WORK_TIME : BREAK_TIME;
                timerState.timeLeft = Math.max(totalTime - elapsedSeconds, 0);

                broadcastTimerUpdate();

                if (timerState.timeLeft <= 0) {
                    clearInterval(timerState.timerInterval);
                    if (timerState.isWorkMode) {
                        timerState.completedPomodoros++;
                        chrome.storage.local.set({ completedPomodoros: timerState.completedPomodoros });
                        sendNotification('Work Session Complete!', 'Time to take a break!');
                        timerState.timeLeft = BREAK_TIME;
                        timerState.isWorkMode = false;
                    } else {
                        sendNotification('Break Complete!', 'Time to get back to work!');
                        timerState.timeLeft = WORK_TIME;
                        timerState.isWorkMode = true;
                    }
                    timerState.isRunning = false;
                    timerState.startTime = null;
                    broadcastTimerUpdate();
                }
            } catch (error) {
                console.log('Error in timer interval:', error);
                stopTimer();
            }
        }, 1000);
    }
};

const stopTimer = () => {
    if (timerState.isRunning) {
        clearInterval(timerState.timerInterval);
        timerState.isRunning = false;
        timerState.startTime = null;
        broadcastTimerUpdate();
    }
};

// Load saved state on service worker start
chrome.storage.local.get(['completedPomodoros'], (result) => {
    if (result.completedPomodoros !== undefined) {
        timerState.completedPomodoros = result.completedPomodoros;
    }
});

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    // Initialize storage with default values
    chrome.storage.local.set({ 
        completedPomodoros: 0,
        todos: []
    });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        switch (message.type) {
            case 'startTimer':
                startTimer();
                sendResponse({ success: true });
                break;
            case 'stopTimer':
                stopTimer();
                sendResponse({ success: true });
                break;
            case 'getTimerState':
                sendResponse({
                    timeLeft: timerState.timeLeft,
                    isRunning: timerState.isRunning,
                    isWorkMode: timerState.isWorkMode,
                    completedPomodoros: timerState.completedPomodoros
                });
                break;
        }
    } catch (error) {
        console.log('Error handling message:', error);
        sendResponse({ error: error.message });
    }
    return true; // Required for async response
}); 