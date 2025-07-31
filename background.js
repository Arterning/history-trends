// This script runs in the background and listens for the extension icon click.
chrome.action.onClicked.addListener((tab) => {
  // When the user clicks the icon, open the history analysis page.
  chrome.tabs.create({
    url: 'history.html'
  });
});
