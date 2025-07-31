document.addEventListener('DOMContentLoaded', () => {
  const topSitesContainer = document.getElementById('top-sites-container');
  const chartCanvas = document.getElementById('history-chart').getContext('2d');

  chrome.history.search({ text: '', maxResults: 0, startTime: 0 }, (historyItems) => {
    if (!historyItems || historyItems.length === 0) {
      topSitesContainer.innerHTML = '<p>No browsing history to analyze.</p>';
      return;
    }

    const domainCounts = countDomains(historyItems);
    const sortedDomains = Object.entries(domainCounts).sort(([, a], [, b]) => b - a);

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
