document.addEventListener('DOMContentLoaded', () => {
  const historyList = document.getElementById('history-list');
  const topSitesContainer = document.getElementById('top-sites-container');
  const chartCanvas = document.getElementById('history-chart').getContext('2d');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  let allHistoryItems = [];
  let filteredHistoryItems = [];
  let currentPage = 1;
  const pageSize = 500;

  chrome.history.search({ text: '', maxResults: 0, startTime: 0 }, (historyItems) => {
    if (!historyItems || historyItems.length === 0) {
      historyList.innerHTML = '<li>No browsing history found.</li>';
      return;
    }

    allHistoryItems = historyItems;
    filteredHistoryItems = allHistoryItems;

    const domainCounts = countDomains(historyItems);
    const sortedDomains = Object.entries(domainCounts).sort(([, a], [, b]) => b - a);

    renderFullHistory();
    updatePagination();
    displayTopSites(sortedDomains.slice(0, 10));
    renderHistoryChart(sortedDomains.slice(0, 15)); // Use top 15 for the chart
  });

  function countDomains(items) {
    const domainCounts = {};
    items.forEach(item => {
      try {
        const url = new URL(item.url);
        const domain = url.hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      } catch (e) {
        // Ignore invalid URLs
      }
    });
    return domainCounts;
  }

  function renderFullHistory() {
    historyList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const itemsToRender = filteredHistoryItems.slice(start, end);

    itemsToRender.forEach(item => {
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.title || item.url;
      link.target = '_blank';
      
      const time = document.createElement('span');
      time.textContent = ` - ${new Date(item.lastVisitTime).toLocaleString()}`;
      time.className = 'visit-time';

      listItem.appendChild(link);
      listItem.appendChild(time);
      fragment.appendChild(listItem);
    });
    historyList.appendChild(fragment);
  }

  function updatePagination() {
    const totalPages = Math.ceil(filteredHistoryItems.length / pageSize);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages;
  }

  function performSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    filteredHistoryItems = allHistoryItems.filter(item => {
      const title = item.title ? item.title.toLowerCase() : '';
      const url = item.url ? item.url.toLowerCase() : '';
      return title.includes(searchTerm) || url.includes(searchTerm);
    });
    currentPage = 1;
    renderFullHistory();
    updatePagination();
  }

  searchButton.addEventListener('click', performSearch);
  searchInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      performSearch();
    }
  });

  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderFullHistory();
      updatePagination();
    }
  });

  nextPageButton.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredHistoryItems.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderFullHistory();
      updatePagination();
    }
  });

  function displayTopSites(topSites) {
    const fragment = document.createDocumentFragment();
    topSites.forEach(([domain, count]) => {
      const card = document.createElement('div');
      card.className = 'site-card';
      
      const title = document.createElement('h3');
      title.textContent = domain;
      
      const visitCount = document.createElement('p');
      visitCount.textContent = `${count} visits`;
      
      card.appendChild(title);
      card.appendChild(visitCount);
      fragment.appendChild(card);
    });
    topSitesContainer.appendChild(fragment);
  }

  function renderHistoryChart(chartData) {
    const labels = chartData.map(([domain]) => domain);
    const data = chartData.map(([, count]) => count);

    new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Website Visits',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#495057'
            }
          },
          x: {
            ticks: {
              color: '#495057'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

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

    const filteredDomains = Object.keys(groupedHistoryData)
      .filter(domain => domain.toLowerCase().includes(lowerCaseSearchTerm))
      .sort();

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

  // Initial load for today
  fetchAndGroupHistory(getStartOf('today'));
});



