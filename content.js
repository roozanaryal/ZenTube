// Cache the user's preferences, updated when a message is received from the popup
let preferences = {};
// Timeout variable for debouncing the hiding logic
let debounceTimeout;

// --- Helper Functions ---

// Function to hide elements matching a given CSS selector
function hideElement(selector) {
  const elements = document.querySelectorAll(selector);
  console.log(`Attempting to hide ${selector}: ${elements.length} elements found`);
  elements.forEach(el => {
    // Hide the element by setting its display style to 'none'
    el.style.display = 'none';
  });
}

// Function to show elements matching a given CSS selector
function showElement(selector) {
  const elements = document.querySelectorAll(selector);
  console.log(`Attempting to show ${selector}: ${elements.length} elements found`);
  elements.forEach(el => {
    // Clear any inline styles that might be hiding the element
    el.style.cssText = '';
    // Force a reflow to ensure the element is rendered correctly after changing styles
    el.offsetHeight;
  });
}

// --- Initialization ---

// Log to confirm the content script has been injected and is running
console.log('ZenTube content script initialized on:', window.location.href);

// Apply hiding rules immediately when the script loads based on stored preferences
chrome.storage.sync.get(['hideHomepageFeed', 'hideRecommendedVideos', 'hideComments', 'hideAutoplayToggle'], function(result) {
  // Check for errors during storage retrieval
  if (chrome.runtime.lastError) {
    console.error('Storage error on initial load:', chrome.runtime.lastError);
    return;
  }
  // Store the retrieved preferences
  preferences = result;
  console.log('Loaded preferences on startup:', preferences);

  // Apply hiding rules based on the loaded preferences
  if (preferences.hideHomepageFeed) {
    hideElement('#primary ytd-rich-grid-renderer'); // Selector for the homepage feed
  }
  if (preferences.hideRecommendedVideos) {
    hideElement('.ytd-watch-next-secondary-results-renderer'); // Selector for recommended videos on watch pages
  }
  if (preferences.hideComments) {
    hideElement('#comments'); // Selector for the comments section
  }
  if (preferences.hideAutoplayToggle) {
    hideElement('.ytp-autonav-toggle-button'); // Selector for the autoplay toggle on the video player
  }
});

// --- Dynamic Hiding with MutationObserver ---

// Debounced function to apply hiding rules.
// Debouncing prevents the function from running too frequently during rapid DOM changes.
const debouncedHide = () => {
  // Re-apply hiding rules based on the current preferences
  if (preferences.hideHomepageFeed) hideElement('#primary ytd-rich-grid-renderer');
  if (preferences.hideRecommendedVideos) hideElement('.ytd-watch-next-secondary-results-renderer');
  if (preferences.hideComments) hideElement('#comments');
  if (preferences.hideAutoplayToggle) hideElement('.ytp-autonav-toggle-button');
};

// Set up a MutationObserver to watch for changes in the DOM
// This helps hide elements that are loaded dynamically after the initial page load
const targetNode = document.querySelector('#primary') || document.body; // The element to observe (homepage feed or body)
const observer = new MutationObserver(() => {
  // When a mutation is detected, clear any existing debounce timeout
  clearTimeout(debounceTimeout);
  // Set a new timeout to run the debouncedHide function after a short delay
  // This groups multiple rapid mutations into a single hiding operation
  debounceTimeout = setTimeout(debouncedHide, 100); // 100ms debounce delay
});
// Start observing the target node for changes in its children or subtree
observer.observe(targetNode, { childList: true, subtree: true });

// --- Message Listener ---

// Listen for messages sent from other parts of the extension (like the popup script)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received in content script:', request);

  // Check if the received message is the 'updatePreferences' action
  if (request.action === 'updatePreferences') {
    console.log('Received updatePreferences message.');

    // Before applying new rules, show all elements that might have been hidden
    // This ensures that if a setting was turned OFF, the element becomes visible again
    showElement('#primary ytd-rich-grid-renderer');
    showElement('.ytd-watch-next-secondary-results-renderer');
    showElement('#comments');
    showElement('.ytp-autonav-toggle-button');

    // Retrieve the latest preferences from storage
    chrome.storage.sync.get(['hideHomepageFeed', 'hideRecommendedVideos', 'hideComments', 'hideAutoplayToggle'], function(result) {
      // Check for errors during storage retrieval
      if (chrome.runtime.lastError) {
        console.error('Storage error on update:', chrome.runtime.lastError);
        // Send a response indicating failure
        sendResponse({status: 'Failed to update preferences'});
        return;
      }
      // Update the cached preferences with the latest data
      preferences = result;
      console.log('Updated preferences:', preferences);

      // Reapply the hiding rules based on the newly loaded preferences
      debouncedHide();

      // Send a response back to the sender (the popup script) indicating success
      sendResponse({status: 'Preferences updated successfully'});
    });

    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  }
});
