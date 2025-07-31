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
});



