// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', function() {
  // Select all elements with the class 'toggle-switch' (our hidden checkboxes)
  const toggleSwitches = document.querySelectorAll('.toggle-switch');

  // --- Load Saved Preferences ---
  // Retrieve stored preferences from Chrome's sync storage
  chrome.storage.sync.get(['hideHomepageFeed', 'hideRecommendedVideos', 'hideComments', 'hideAutoplayToggle'], function(result) {
    // Check if there was an error retrieving storage data
    if (chrome.runtime.lastError) {
      console.error('Storage error on load:', chrome.runtime.lastError);
      // In a real app, you might want to show a user-friendly error message here
      return;
    }
    console.log('Loaded preferences:', result);

    // Set the initial checked state of each toggle switch based on loaded preferences
    // Use logical OR || false to default to false if no preference is found (first run)
    document.getElementById('hideHomepageFeed').checked = result.hideHomepageFeed || false;
    document.getElementById('hideRecommendedVideos').checked = result.hideRecommendedVideos || false;
    document.getElementById('hideComments').checked = result.hideComments || false;
    document.getElementById('hideAutoplayToggle').checked = result.hideAutoplayToggle || false;

    // --- Add Event Listeners ---
    // Add a 'change' event listener to each toggle switch
    // This listens for when the state of the checkbox changes (when the user clicks the visual toggle)
    toggleSwitches.forEach(toggleSwitch => {
      toggleSwitch.addEventListener('change', handleToggleChange);
    });
  });

  // --- Handle Toggle Change ---
  // Function executed when a toggle switch's state changes
  function handleToggleChange(event) {
    const changedToggle = event.target; // Get the checkbox that triggered the event
    const checkboxId = changedToggle.id; // Get the ID of the checkbox (e.g., 'hideHomepageFeed')
    const isChecked = changedToggle.checked; // Get the new checked state (true or false)
    console.log(`${checkboxId} is now ${isChecked}`);

    // --- Save Preference ---
    // Create an object with the specific preference that changed
    const preferenceToSave = { [checkboxId]: isChecked };
    // Save the updated preference to Chrome's sync storage
    chrome.storage.sync.set(preferenceToSave, function() {
      // Check for errors during the save operation
      if (chrome.runtime.lastError) {
        console.error('Storage error on save:', chrome.runtime.lastError);
        // In a real app, you might want to show a user-friendly error message here
        return;
      }
      console.log('Preference saved:', preferenceToSave);

      // --- Notify Content Script ---
      // Find the currently active tab in the current window
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // Check if an active tab was found
        if (!tabs[0]) {
          console.error('No active tab found');
          return;
        }
        const activeTab = tabs[0];
        console.log('Active tab:', activeTab.id, activeTab.url);

        // Check if the active tab's URL is a YouTube page before sending a message
        // This prevents sending messages to tabs where the content script isn't injected
        if (activeTab.url && activeTab.url.startsWith('https://www.youtube.com/')) {
           // Send a message to the content script in the active tab
           chrome.tabs.sendMessage(activeTab.id, {action: 'updatePreferences'}, function(response) {
             // Check for runtime errors after sending the message
             // This can happen if the content script failed to respond or is not running
             if (chrome.runtime.lastError) {
               console.error('Failed to send message to tab:', chrome.runtime.lastError.message);
               // You might want to handle specific errors differently, e.g., if the content script isn't loaded
               return;
             }
             console.log('Message sent successfully, response:', response);
           });
        } else {
          console.warn('Active tab is not a YouTube page, not sending message:', activeTab.url);
          // Optionally provide feedback to the user that settings will apply on YouTube pages
        }
      });
    });
  }
});
