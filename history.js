document.addEventListener('DOMContentLoaded', () => {
  const historyList = document.getElementById('history-list');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  let allHistoryItems = [];
  let filteredHistoryItems = [];
  let currentPage = 1;
  const pageSize = 50;

  chrome.history.search({ text: '', maxResults: 0, startTime: 0 }, (historyItems) => {
    if (!historyItems || historyItems.length === 0) {
      historyList.innerHTML = '<li>No browsing history found.</li>';
      return;
    }

    allHistoryItems = historyItems;
    filteredHistoryItems = allHistoryItems;

    renderFullHistory();
    updatePagination();
  });

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

    
});


