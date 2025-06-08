// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitches = document.querySelectorAll('.toggle-switch');

  // --- Load Saved Preferences ---
  // Add 'pauseOnTabLeave' to the list of preferences to retrieve
  chrome.storage.sync.get(['hideHomepageFeed', 'hideRecommendedVideos', 'hideComments', 'hideAutoplayToggle', 'pauseOnTabLeave'], function(result) {
    if (chrome.runtime.lastError) {
      console.error('Storage error on load:', chrome.runtime.lastError);
      return;
    }
    console.log('Loaded preferences:', result);

    document.getElementById('hideHomepageFeed').checked = result.hideHomepageFeed || false;
    document.getElementById('hideRecommendedVideos').checked = result.hideRecommendedVideos || false;
    document.getElementById('hideComments').checked = result.hideComments || false;
    document.getElementById('hideAutoplayToggle').checked = result.hideAutoplayToggle || false;
    // Set the initial state for the new toggle
    document.getElementById('pauseOnTabLeave').checked = result.pauseOnTabLeave || false; // NEW LINE

    toggleSwitches.forEach(toggleSwitch => {
      toggleSwitch.addEventListener('change', handleToggleChange);
    });
  });

  // --- Handle Toggle Change ---
  function handleToggleChange(event) {
    const changedToggle = event.target;
    const checkboxId = changedToggle.id;
    const isChecked = changedToggle.checked;
    console.log(`${checkboxId} is now ${isChecked}`);

    const preferenceToSave = { [checkboxId]: isChecked };
    chrome.storage.sync.set(preferenceToSave, function() {
      if (chrome.runtime.lastError) {
        console.error('Storage error on save:', chrome.runtime.lastError);
        return;
      }
      console.log('Preference saved:', preferenceToSave);

      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs[0]) {
          console.error('No active tab found');
          return;
        }
        const activeTab = tabs[0];
        console.log('Active tab:', activeTab.id, activeTab.url);

        // Make sure to include the correct YouTube URLs here
        if (activeTab.url && (activeTab.url.startsWith('https://www.youtube.com/') || activeTab.url.startsWith('http://www.youtube.com/'))) {
           chrome.tabs.sendMessage(activeTab.id, {action: 'updatePreferences'}, function(response) {
             if (chrome.runtime.lastError) {
               console.error('Failed to send message to tab:', chrome.runtime.lastError.message);
               return;
             }
             console.log('Message sent successfully, response:', response);
           });
        } else {
          console.warn('Active tab is not a YouTube page, not sending message:', activeTab.url);
        }
      });
    });
  }
});