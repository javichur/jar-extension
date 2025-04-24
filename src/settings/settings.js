document.addEventListener('DOMContentLoaded', function() {
    const saveButton = document.getElementById('save-settings');
    const inputField = document.getElementById('input-field');

    // Load saved settings from local storage
    chrome.storage.local.get(['userSetting'], function(result) {
        if (result.userSetting) {
            inputField.value = result.userSetting;
        }
    });

    // Save settings to local storage
    saveButton.addEventListener('click', function() {
        const userSetting = inputField.value;
        chrome.storage.local.set({ userSetting: userSetting }, function() {
            alert('Settings saved!');
        });
    });
});