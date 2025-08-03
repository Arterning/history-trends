document.addEventListener('DOMContentLoaded', () => {
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

    // Modal elements
    const tagModal = document.getElementById('tag-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addTagBtn = document.getElementById('add-tag-btn');
    const newTagInput = document.getElementById('new-tag-input');
    const existingTagsContainer = document.getElementById('existing-tags');

    let groupedHistoryData = {};
    let currentUrlToTag = null;
    let currentTitleToTag = null;
    let currentTagsContainer = null;

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
                const lastVisitA = groupedHistoryData[a][0] ? groupedHistoryData[a][0].lastVisitTime : 0;
                const lastVisitB = groupedHistoryData[b][0] ? groupedHistoryData[b][0].lastVisitTime : 0;
                return lastVisitB - lastVisitA;
            });
        }

        filteredDomains.forEach(domain => {
            const pages = groupedHistoryData[domain];
            const domainLi = document.createElement('li');
            domainLi.className = 'domain-group p-2';

            const domainHeader = document.createElement('div');
            domainHeader.className = 'domain-header cursor-pointer font-bold text-lg';
            domainHeader.textContent = `${domain} (${pages.length} visits)`;

            const pagesUl = document.createElement('ul');
            pagesUl.className = 'page-list pl-4';
            pagesUl.style.display = 'none';

            pages.forEach(page => {
                const pageLi = document.createElement('li');
                pageLi.className = 'flex items-center justify-between p-1';

                const linkDiv = document.createElement('div');
                const link = document.createElement('a');
                link.href = page.url;
                link.textContent = page.title || page.url;
                link.target = '_blank';
                link.className = 'text-blue-600 hover:underline';

                const time = document.createElement('span');
                time.textContent = ` - ${new Date(page.lastVisitTime).toLocaleString()}`;
                time.className = 'visit-time text-gray-500 text-sm ml-2';
                
                linkDiv.appendChild(link);
                linkDiv.appendChild(time);

                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'flex items-center';

                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'tags-container flex gap-1 mr-2';
                loadTagsForUrl(page.url, tagsContainer);

                const addTagButton = document.createElement('button');
                addTagButton.textContent = '+';
                addTagButton.className = 'add-tag-btn bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-600';
                addTagButton.onclick = () => openTagModal(page.url, page.title, tagsContainer);

                controlsDiv.appendChild(tagsContainer);
                controlsDiv.appendChild(addTagButton);
                
                pageLi.appendChild(linkDiv);
                pageLi.appendChild(controlsDiv);
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

    async function loadTagsForUrl(url, container) {
        container.innerHTML = '';
        if (chrome.bookmarks) {
            chrome.bookmarks.search({ url: url }, (bookmarks) => {
                bookmarks.forEach(bookmark => {
                    if (bookmark.parentId) {
                        chrome.bookmarks.get(bookmark.parentId, (results) => {
                            if (results && results.length > 0) {
                                const parentFolder = results[0];
                                // Avoid showing tags for default bookmark folders
                                if (parentFolder.title !== 'Bookmarks bar' && parentFolder.title !== 'Other bookmarks' && parentFolder.title !== 'Mobile bookmarks' && parentFolder.title !== '') {
                                    const tag = createTagBadge(parentFolder.title);
                                    container.appendChild(tag);
                                }
                            }
                        });
                    }
                });
            });
        }
    }

    function createTagBadge(tagName) {
        const badge = document.createElement('span');
        badge.textContent = tagName;
        badge.className = 'bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full';
        return badge;
    }

    function openTagModal(url, title, tagsContainer) {
        currentUrlToTag = url;
        currentTitleToTag = title || url;
        currentTagsContainer = tagsContainer;
        newTagInput.value = '';

        chrome.bookmarks.getTree((tree) => {
            existingTagsContainer.innerHTML = '';
            const folders = findBookmarkFolders(tree);
            folders.forEach(folder => {
                const button = document.createElement('button');
                button.textContent = folder.title;
                button.className = 'w-full text-left p-2 mt-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200';
                button.onclick = () => addBookmark(folder.id);
                existingTagsContainer.appendChild(button);
            });
        });

        tagModal.classList.remove('hidden');
    }

    function findBookmarkFolders(bookmarkTreeNodes) {
        let folders = [];
        for (const node of bookmarkTreeNodes) {
            if (node.children) {
                // We consider folders that are not the main default ones as potential tags
                if (node.title !== 'Bookmarks bar' && node.title !== 'Other bookmarks' && node.title !== 'Mobile bookmarks' && node.title !== '') {
                    folders.push({ id: node.id, title: node.title });
                }
                folders = folders.concat(findBookmarkFolders(node.children));
            }
        }
        return folders;
    }

    function closeModal() {
        tagModal.classList.add('hidden');
    }

    function addBookmark(folderId) {
        chrome.bookmarks.create({
            parentId: folderId,
            title: currentTitleToTag,
            url: currentUrlToTag
        }, () => {
            loadTagsForUrl(currentUrlToTag, currentTagsContainer);
            closeModal();
        });
    }

    addTagBtn.addEventListener('click', () => {
        const newTagName = newTagInput.value.trim();
        if (newTagName) {
            chrome.bookmarks.create({ 'title': newTagName }, (newFolder) => {
                addBookmark(newFolder.id);
            });
        }
    });

    closeModalBtn.addEventListener('click', closeModal);

    todayBtn.addEventListener('click', () => fetchAndGroupHistory(getStartOf('today')));
    weekBtn.addEventListener('click', () => fetchAndGroupHistory(getStartOf('week')));
    monthBtn.addEventListener('click', () => fetchAndGroupHistory(getStartOf('month')));
    yearBtn.addEventListener('click', () => fetchAndGroupHistory(getStartOf('year')));

    customRangeBtn.addEventListener('click', () => {
        const startDate = new Date(startDateInput.value).getTime();
        const endDate = new Date(endDateInput.value).getTime();
        if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
            fetchAndGroupHistory(startDate, endDate + (24 * 60 * 60 * 1000 - 1));
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