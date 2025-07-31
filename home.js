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
      chrome.history.search({ text: '', startTime, endTime, maxResults: 0 }, (historyItems) => {
        groupedHistoryData = groupHistoryByDomain(historyItems);
        renderGroupedHistory();
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
  
    function renderGroupedHistory(searchTerm = '') {
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
  
      filteredDomains.forEach(domain => {
        const pages = groupedHistoryData[domain];
        const domainLi = document.createElement('li');
        domainLi.className = 'domain-group';
        
        const domainHeader = document.createElement('div');
        domainHeader.className = 'domain-header';
        domainHeader.textContent = `${domain} (${pages.length} visits)`;
        
        const pagesUl = document.createElement('ul');
        pagesUl.className = 'page-list';
        pagesUl.style.display = 'none'; // Initially hidden
  
        pages.forEach(page => {
          const pageLi = document.createElement('li');
          const link = document.createElement('a');
          link.href = page.url;
          link.textContent = page.title || page.url;
          link.target = '_blank';
          
          const time = document.createElement('span');
          time.textContent = ` - ${new Date(page.lastVisitTime).toLocaleString()}`;
          time.className = 'visit-time';
  
          pageLi.appendChild(link);
          pageLi.appendChild(time);
          pagesUl.appendChild(pageLi);
        });
  
        domainHeader.addEventListener('click', () => {
          pagesUl.style.display = pagesUl.style.display === 'none' ? 'block' : 'none';
        });
  
        domainLi.appendChild(domainHeader);
        domainLi.appendChild(pagesUl);
        fragment.appendChild(domainLi);
      });
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
  
    function performGroupedSearch() {
      renderGroupedHistory(groupedSearchInput.value);
    }
  
    groupedSearchButton.addEventListener('click', performGroupedSearch);
    groupedSearchInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        performGroupedSearch();
      }
    });

    sortOrder.addEventListener('change', () => renderGroupedHistory(groupedSearchInput.value));

  // Initial load for today
  fetchAndGroupHistory(getStartOf('today'));
});


