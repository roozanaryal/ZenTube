// Cache the user's preferences, updated when a message is received from the popup
let preferences = {};
// Timeout variable for debouncing the hiding logic
let debounceTimeout;

// --- Helper Functions ---

function hideElement(selector) {
  const elements = document.querySelectorAll(selector);
  console.log(`Attempting to hide ${selector}: ${elements.length} elements found`);
  elements.forEach(el => {
    el.style.display = 'none';
  });
}

function showElement(selector) {
  const elements = document.querySelectorAll(selector);
  console.log(`Attempting to show ${selector}: ${elements.length} elements found`);
  elements.forEach(el => {
    el.style.cssText = '';
    el.offsetHeight;
  });
}

// --- NEW FEATURE: Pause Video on Tab Leave ---
function handleVisibilityChange() {
  // If the setting is enabled AND the document is hidden (tab is not active/visible)
  if (preferences.pauseOnTabLeave && document.hidden) {
    // Find the main YouTube video element
    // The class 'html5-main-video' is often used for the primary video player
    const videoElement = document.querySelector('.html5-main-video') || document.querySelector('video');

    if (videoElement && !videoElement.paused) {
      console.log('Tab hidden, pausing YouTube video.');
      videoElement.pause();
    }
  }
  // No action on document.visibilityState === 'visible' (we don't auto-play when tab becomes active again)
}

// Add the visibility change listener once when the content script loads
document.addEventListener('visibilitychange', handleVisibilityChange);
// --- END NEW FEATURE ---


// --- Initialization ---
console.log('ZenTube content script initialized on:', window.location.href);

// Ensure all preferences including the new one are loaded
chrome.storage.sync.get(['hideHomepageFeed', 'hideRecommendedVideos', 'hideComments', 'hideAutoplayToggle', 'pauseOnTabLeave'], function(result) { // Added 'pauseOnTabLeave'
  if (chrome.runtime.lastError) {
    console.error('Storage error on initial load:', chrome.runtime.lastError);
    return;
  }
  preferences = result;
  console.log('Loaded preferences on startup:', preferences);

  if (preferences.hideHomepageFeed) {
    hideElement('#primary ytd-rich-grid-renderer');
  }
  if (preferences.hideRecommendedVideos) {
    hideElement('.ytd-watch-next-secondary-results-renderer');
  }
  if (preferences.hideComments) {
    hideElement('#comments');
  }
  if (preferences.hideAutoplayToggle) {
    hideElement('.ytp-autonav-toggle-button');
  }
  // No immediate action for pauseOnTabLeave on load, as it reacts to visibility change
});

// --- Dynamic Hiding with MutationObserver ---
const debouncedHide = () => {
  if (preferences.hideHomepageFeed) hideElement('#primary ytd-rich-grid-renderer');
  if (preferences.hideRecommendedVideos) hideElement('.ytd-watch-next-secondary-results-renderer');
  if (preferences.hideComments) hideElement('#comments');
  if (preferences.hideAutoplayToggle) hideElement('.ytp-autonav-toggle-button');
  // pauseOnTabLeave is handled by its own event listener, not by DOM mutations
};

const targetNode = document.querySelector('#primary') || document.body;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(debouncedHide, 100);
});
observer.observe(targetNode, { childList: true, subtree: true });

// --- Message Listener ---
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received in content script:', request);

  if (request.action === 'updatePreferences') {
    console.log('Received updatePreferences message.');

    // Always show elements before reapplying to ensure correct state after preference change
    showElement('#primary ytd-rich-grid-renderer');
    showElement('.ytd-watch-next-secondary-results-renderer');
    showElement('#comments');
    showElement('.ytp-autonav-toggle-button');

    // Make sure to retrieve the new preference when updating
    chrome.storage.sync.get(['hideHomepageFeed', 'hideRecommendedVideos', 'hideComments', 'hideAutoplayToggle', 'pauseOnTabLeave'], function(result) { // Added 'pauseOnTabLeave'
      if (chrome.runtime.lastError) {
        console.error('Storage error on update:', chrome.runtime.lastError);
        sendResponse({status: 'Failed to update preferences'});
        return;
      }
      preferences = result; // Update the cached preferences
      console.log('Updated preferences:', preferences);

      // Reapply hiding rules based on updated preferences
      debouncedHide(); // This handles visual hiding rules

      // The pauseOnTabLeave logic will automatically react via its event listener
      // when the document visibility changes, as 'preferences' is now updated.

      sendResponse({status: 'Preferences updated successfully'});
    });
    return true; // Indicate that sendResponse will be called asynchronously
  }
});