chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed.');
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Chrome has started.');
});


chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
            console.log('Extension action button clicked on tab:', tab);
        }
    });
});

chrome.storage.sync.get(['zipFilename', 'compressionLevel'], (items) => {
    console.log('Stored options:', items);
});
