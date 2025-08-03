// This script runs in the background and handles bookmark operations.
// The extension now uses a popup interface instead of opening a new tab.

// Bookmark functions in background script
async function getBookmarksForUrl(url) {
  try {
    const bookmarks = await chrome.bookmarks.search({ url: url });
    
    // Get bookmark tree to find parent folder names
    const tree = await chrome.bookmarks.getTree();
    const bookmarkFolders = {};
    
    // Build a map of folder IDs to folder names
    function traverseBookmarks(bookmarkItems) {
      for (const item of bookmarkItems) {
        if (item.children) {
          // This is a folder
          bookmarkFolders[item.id] = item.title;
          traverseBookmarks(item.children);
        }
      }
    }
    
    traverseBookmarks(tree);
    
    // Add folder information to each bookmark
    const bookmarksWithFolders = bookmarks.map(bookmark => ({
      ...bookmark,
      folderName: bookmarkFolders[bookmark.parentId] || '默认'
    }));
    
    return bookmarksWithFolders;
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }
}

async function getAllBookmarkFolders() {
  try {
    const tree = await chrome.bookmarks.getTree();
    const folders = [];
    
    function traverseBookmarks(bookmarkItems) {
      for (const item of bookmarkItems) {
        if (item.url) {
          // This is a bookmark, not a folder
          continue;
        }
        
        if (item.children) {
          // This is a folder
          folders.push({
            id: item.id,
            title: item.title,
            parentId: item.parentId
          });
          traverseBookmarks(item.children);
        }
      }
    }
    
    traverseBookmarks(tree);
    return folders;
  } catch (error) {
    console.error('Error fetching bookmark folders:', error);
    return [];
  }
}

async function createBookmarkFolder(parentId, title) {
  try {
    const folder = await chrome.bookmarks.create({
      parentId: parentId || '1', // Default to bookmark bar
      title: title
    });
    return { success: true, folder: folder };
  } catch (error) {
    console.error('Error creating bookmark folder:', error);
    return { success: false, error: error.message };
  }
}

async function addBookmark(url, title, parentId) {
  try {
    const bookmark = await chrome.bookmarks.create({
      url: url,
      title: title,
      parentId: parentId || '1' // Default to bookmark bar
    });
    return { success: true, bookmark: bookmark };
  } catch (error) {
    console.error('Error adding bookmark:', error);
    return { success: false, error: error.message };
  }
}

async function removeBookmark(bookmarkId) {
  try {
    await chrome.bookmarks.remove(bookmarkId);
    return { success: true };
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return { success: false, error: error.message };
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBookmarks') {
    getBookmarksForUrl(request.url).then(bookmarks => {
      sendResponse({ success: true, bookmarks: bookmarks });
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'getBookmarkFolders') {
    getAllBookmarkFolders().then(folders => {
      sendResponse({ success: true, folders: folders });
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'createBookmarkFolder') {
    createBookmarkFolder(request.parentId, request.title).then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'addBookmark') {
    addBookmark(request.url, request.title, request.parentId).then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'removeBookmark') {
    removeBookmark(request.bookmarkId).then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  }
});
