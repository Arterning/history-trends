document.addEventListener('DOMContentLoaded', () => {

    // --- Grouped History ---
    const groupedHistoryList = document.getElementById('grouped-history-list');
    const todayBtn = document.getElementById('today-btn');
    const weekBtn = document.getElementById('week-btn');
    const monthBtn = document.getElementById('month-btn');
    const yearBtn = document.getElementById('year-btn');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const customRangeBtn = document.getElementById('custom-range-btn');
    const groupedSearchInput = document.getElementById('grouped-search-input');
    const groupedSearchButton = document.getElementById('grouped-search-button');
    const sortOrder = document.getElementById('sort-order');
  
    let groupedHistoryData = {};
  
    // Bookmark functions using message passing to background script
    async function getBookmarksForUrl(url) {
      try {
        // Check if we're in a Chrome extension context
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.warn('Not in Chrome extension context');
          return [];
        }
        
        const response = await chrome.runtime.sendMessage({
          action: 'getBookmarks',
          url: url
        });
        return response.success ? response.bookmarks : [];
      } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return [];
      }
    }

    async function getBookmarkFolders() {
      try {
        // Check if we're in a Chrome extension context
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.warn('Not in Chrome extension context');
          return [];
        }
        
        const response = await chrome.runtime.sendMessage({
          action: 'getBookmarkFolders'
        });
        return response.success ? response.folders : [];
      } catch (error) {
        console.error('Error fetching bookmark folders:', error);
        return [];
      }
    }

    async function createBookmarkFolder(parentId, title) {
      try {
        // Check if we're in a Chrome extension context
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.warn('Not in Chrome extension context');
          return false;
        }
        
        const response = await chrome.runtime.sendMessage({
          action: 'createBookmarkFolder',
          parentId: parentId,
          title: title
        });
        return response.success;
      } catch (error) {
        console.error('Error creating bookmark folder:', error);
        return false;
      }
    }

    async function addBookmark(url, title, parentId) {
      try {
        // Check if we're in a Chrome extension context
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.warn('Not in Chrome extension context');
          return false;
        }
        
        const response = await chrome.runtime.sendMessage({
          action: 'addBookmark',
          url: url,
          title: title,
          parentId: parentId
        });
        return response.success;
      } catch (error) {
        console.error('Error adding bookmark:', error);
        return false;
      }
    }

    async function removeBookmark(bookmarkId) {
      try {
        // Check if we're in a Chrome extension context
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.warn('Not in Chrome extension context');
          return false;
        }
        
        const response = await chrome.runtime.sendMessage({
          action: 'removeBookmark',
          bookmarkId: bookmarkId
        });
        return response.success;
      } catch (error) {
        console.error('Error removing bookmark:', error);
        return false;
      }
    }

    function createBookmarkIcon(bookmarks, url, title) {
      const bookmarkContainer = document.createElement('div');
      bookmarkContainer.className = 'bookmark-container';
      
      // Show existing bookmarks with badges
      if (bookmarks.length > 0) {
        // Create bookmarks display
        const bookmarksDisplay = document.createElement('div');
        bookmarksDisplay.className = 'bookmarks-display';
        
        bookmarks.forEach(bookmark => {
          const bookmarkBadge = document.createElement('span');
          bookmarkBadge.className = 'bookmark-badge';
          bookmarkBadge.innerHTML = `★ ${bookmark.folderName}`;
          bookmarkBadge.title = `Bookmarked in: ${bookmark.folderName}`;
          
          bookmarkBadge.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Remove bookmark from "${bookmark.folderName}"?`)) {
              const success = await removeBookmark(bookmark.id);
              if (success) {
                bookmarkBadge.remove();
                // Refresh bookmarks after removal
                const updatedBookmarks = await getBookmarksForUrl(url);
                if (updatedBookmarks.length === 0) {
                  bookmarksDisplay.remove();
                }
              }
            }
          });
          
          bookmarksDisplay.appendChild(bookmarkBadge);
        });
        
        bookmarkContainer.appendChild(bookmarksDisplay);
      } else {
        // Show "默认" badge when no bookmarks exist
        const defaultBadge = document.createElement('span');
        defaultBadge.className = 'bookmark-badge bookmark-badge-default';
        defaultBadge.innerHTML = '★ 默认';
        defaultBadge.title = 'No bookmarks - click to add';
        defaultBadge.style.opacity = '0.6';
        
        // Make default badge clickable to add bookmark
        defaultBadge.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await showBookmarkFolderDialog(url, title, bookmarkContainer);
        });
        
        bookmarkContainer.appendChild(defaultBadge);
      }
      
      // Always show add bookmark button (for multiple bookmarks)
      const addBookmarkBtn = createAddBookmarkButton(url, title, bookmarkContainer);
      bookmarkContainer.appendChild(addBookmarkBtn);
      
      return bookmarkContainer;
    }

    function createAddBookmarkButton(url, title, container) {
      const addBtn = document.createElement('span');
      addBtn.className = 'bookmark-icon text-gray-400 hover:text-yellow-500';
      addBtn.innerHTML = '☆';
      addBtn.title = 'Add to bookmarks';
      
      addBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Show bookmark folder selection dialog
        await showBookmarkFolderDialog(url, title, container);
      });
      
      return addBtn;
    }

    async function showBookmarkFolderDialog(url, title, container) {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.className = 'bookmark-dialog-modal';
      
      const dialog = document.createElement('div');
      dialog.className = 'bookmark-dialog';
      
      dialog.innerHTML = `
        <h3>Add Bookmark</h3>
        <div>
          <label>Select Folder:</label>
          <select id="bookmark-folder-select">
            <option value="1">Bookmarks Bar</option>
          </select>
        </div>
        <div>
          <label>Or Create New Folder:</label>
          <input type="text" id="new-folder-name" placeholder="New folder name">
        </div>
        <div class="bookmark-dialog-buttons">
          <button id="cancel-btn" class="bookmark-dialog-btn bookmark-dialog-btn-cancel">Cancel</button>
          <button id="add-btn" class="bookmark-dialog-btn bookmark-dialog-btn-add">Add Bookmark</button>
        </div>
      `;
      
      modal.appendChild(dialog);
      document.body.appendChild(modal);
      
      // Load bookmark folders
      const folders = await getBookmarkFolders();
      const select = dialog.querySelector('#bookmark-folder-select');
      
      folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.title;
        select.appendChild(option);
      });
      
      // Handle cancel
      dialog.querySelector('#cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      // Handle add bookmark
      dialog.querySelector('#add-btn').addEventListener('click', async () => {
        const selectedFolderId = select.value;
        const newFolderName = dialog.querySelector('#new-folder-name').value.trim();
        
        let targetFolderId = selectedFolderId;
        
        // Create new folder if name is provided
        if (newFolderName) {
          const folderCreated = await createBookmarkFolder(selectedFolderId, newFolderName);
          if (folderCreated) {
            // Get the newly created folder ID
            const updatedFolders = await getBookmarkFolders();
            const newFolder = updatedFolders.find(f => f.title === newFolderName);
            if (newFolder) {
              targetFolderId = newFolder.id;
            }
          }
        }
        
        // Add bookmark
        const success = await addBookmark(url, title, targetFolderId);
        if (success) {
          // Refresh bookmarks display
          const bookmarks = await getBookmarksForUrl(url);
          container.innerHTML = '';
          const newBookmarkIcon = createBookmarkIcon(bookmarks, url, title);
          container.innerHTML = newBookmarkIcon.innerHTML;
        }
        
        document.body.removeChild(modal);
      });
      
      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
    }
  
    function getStartOf(period) {
      const now = new Date();
      switch (period) {
        case 'today':
          return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        case 'week':
          const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          return new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate()).getTime();
        case 'month':
          return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        case 'year':
          return new Date(now.getFullYear(), 0, 1).getTime();
        default:
          return 0;
      }
    }
  
    function fetchAndGroupHistory(startTime, endTime = new Date().getTime()) {
      chrome.history.search({ text: '', startTime, endTime, maxResults: 0 }, async (historyItems) => {
        groupedHistoryData = groupHistoryByDomain(historyItems);
        await renderGroupedHistory();
      });
    }
  
    function groupHistoryByDomain(items) {
      const grouped = {};
      items.forEach(item => {
        try {
          const url = new URL(item.url);
          const domain = url.hostname;
          if (!grouped[domain]) {
            grouped[domain] = [];
          }
          grouped[domain].push(item);
        } catch (e) {
          // Ignore invalid URLs
        }
      });
      // Sort pages within each domain by time
      for (const domain in grouped) {
        grouped[domain].sort((a, b) => b.lastVisitTime - a.lastVisitTime);
      }
      return grouped;
    }
  
    async function renderGroupedHistory(searchTerm = '') {
      groupedHistoryList.innerHTML = '';
      const fragment = document.createDocumentFragment();
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
  
      let filteredDomains = Object.keys(groupedHistoryData)
        .filter(domain => domain.toLowerCase().includes(lowerCaseSearchTerm));

      const sortValue = sortOrder.value;
      if (sortValue === 'visits') {
        filteredDomains.sort((a, b) => groupedHistoryData[b].length - groupedHistoryData[a].length);
      } else if (sortValue === 'time') {
        filteredDomains.sort((a, b) => {
          const lastVisitA = groupedHistoryData[a][0].lastVisitTime;
          const lastVisitB = groupedHistoryData[b][0].lastVisitTime;
          return lastVisitB - lastVisitA;
        });
      }
  
      // Process domains asynchronously
      const domainPromises = filteredDomains.map(async (domain) => {
        const pages = groupedHistoryData[domain];
        const domainLi = document.createElement('li');
        domainLi.className = 'domain-group';
        
        const domainHeader = document.createElement('div');
        domainHeader.className = 'domain-header';
        domainHeader.textContent = `${domain} (${pages.length} visits)`;
        
        const pagesUl = document.createElement('ul');
        pagesUl.className = 'page-list';
        pagesUl.style.display = 'none'; // Initially hidden
  
        // Process pages asynchronously
        const pagePromises = pages.map(async (page) => {
          const pageLi = document.createElement('li');
          
          const linkContainer = document.createElement('div');
          linkContainer.className = 'link-container';
          
          const titleContainer = document.createElement('div');
          titleContainer.className = 'title-container';
          
          const link = document.createElement('a');
          link.href = page.url;
          link.textContent = page.title || page.url;
          link.target = '_blank';
          
          // Get bookmarks for this URL
          const bookmarks = await getBookmarksForUrl(page.url);
          const bookmarkContainer = createBookmarkIcon(bookmarks, page.url, page.title || page.url);
          
          const time = document.createElement('span');
          time.textContent = ` - ${new Date(page.lastVisitTime).toLocaleString()}`;
          time.className = 'visit-time text-gray-500 text-sm';
  
          titleContainer.appendChild(link);
          titleContainer.appendChild(bookmarkContainer);
          linkContainer.appendChild(titleContainer);
          pageLi.appendChild(linkContainer);
          pageLi.appendChild(time);
          return pageLi;
        });
        
        const pageElements = await Promise.all(pagePromises);
        pageElements.forEach(pageLi => pagesUl.appendChild(pageLi));
  
        domainHeader.addEventListener('click', () => {
          pagesUl.style.display = pagesUl.style.display === 'none' ? 'block' : 'none';
        });
  
        domainLi.appendChild(domainHeader);
        domainLi.appendChild(pagesUl);
        return domainLi;
      });
      
      const domainElements = await Promise.all(domainPromises);
      domainElements.forEach(domainLi => fragment.appendChild(domainLi));
      groupedHistoryList.appendChild(fragment);
    }
  
    todayBtn.addEventListener('click', () => fetchAndGroupHistory(getStartOf('today')));
    weekBtn.addEventListener('click', () => fetchAndGroupHistory(getStartOf('week')));
    monthBtn.addEventListener('click', () => fetchAndGroupHistory(getStartOf('month')));
    yearBtn.addEventListener('click', () => fetchAndGroupHistory(getStartOf('year')));
  
    customRangeBtn.addEventListener('click', () => {
      const startDate = new Date(startDateInput.value).getTime();
      const endDate = new Date(endDateInput.value).getTime();
      if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
        fetchAndGroupHistory(startDate, endDate + (24 * 60 * 60 * 1000 - 1)); // Include the whole end day
      } else {
        alert('Please select a valid date range.');
      }
    });
  
    async function performGroupedSearch() {
      await renderGroupedHistory(groupedSearchInput.value);
    }
  
    groupedSearchButton.addEventListener('click', performGroupedSearch);
    groupedSearchInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        performGroupedSearch();
      }
    });

    sortOrder.addEventListener('change', async () => await renderGroupedHistory(groupedSearchInput.value));

  // Initial load for today
  fetchAndGroupHistory(getStartOf('today'));
});


