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
  
      // Filter domains and pages by search term
      let filteredDomains = [];
      
      for (const domain of Object.keys(groupedHistoryData)) {
        const pages = groupedHistoryData[domain];
        const domainMatches = domain.toLowerCase().includes(lowerCaseSearchTerm);
        
        // Check if any page title matches the search term
        const pageMatches = pages.some(page => {
          const title = page.title || page.url;
          return title.toLowerCase().includes(lowerCaseSearchTerm);
        });
        
        if (domainMatches || pageMatches) {
          filteredDomains.push(domain);
        }
      }
      
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
        
        // Create favicon element
        const favicon = document.createElement('img');
        favicon.className = 'domain-favicon';
        favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        favicon.alt = `${domain} favicon`;
        favicon.onerror = function() {
          // Fallback to a default icon if favicon fails to load
          this.style.display = 'none';
        };
        
        // Create domain text
        const domainText = document.createElement('span');
        domainText.textContent = `${domain} (${pages.length} visits)`;
        
        domainHeader.appendChild(favicon);
        domainHeader.appendChild(domainText);
        
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
          
          // Highlight search matches
          if (searchTerm && searchTerm.trim() !== '') {
            const title = page.title || page.url;
            const lowerCaseTitle = title.toLowerCase();
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            
            if (lowerCaseTitle.includes(lowerCaseSearchTerm)) {
              link.classList.add('search-highlight');
            }
          }
          
          
          const time = document.createElement('span');
          time.textContent = ` - ${new Date(page.lastVisitTime).toLocaleString()}`;
          time.className = 'visit-time text-gray-500 text-sm';
  
          titleContainer.appendChild(link);
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


