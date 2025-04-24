// This file contains the background script for the Chrome extension. 
// It manages events and handles tasks that need to run in the background.

chrome.runtime.onInstalled.addListener(() => {
    console.log("Jar Extension installed.");
});

// Additional background tasks can be added here.