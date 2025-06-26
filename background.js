// 存储历史记录数据
let historyData = [];

// 从storage加载数据
async function loadData() {
  const result = await chrome.storage.local.get('historyData');
  historyData = result.historyData || [];
}

// 保存数据到storage
async function saveData() {
  await chrome.storage.local.set({ historyData });
}

// 监听历史记录变化
chrome.history.onVisited.addListener(async (historyItem) => {
  await loadData();
  
  // 检查是否已存在相同URL的记录
  const existingIndex = historyData.findIndex(item => item.url === historyItem.url);
  const now = new Date();
  
  if (existingIndex >= 0) {
    // 更新现有记录
    historyData[existingIndex].lastVisitTime = now.getTime();
    historyData[existingIndex].visitCount = (historyData[existingIndex].visitCount || 1) + 1;
    if (!historyData[existingIndex].title && historyItem.title) {
      historyData[existingIndex].title = historyItem.title;
    }
  } else {
    // 添加新记录
    historyData.push({
      url: historyItem.url,
      title: historyItem.title || historyItem.url,
      firstVisitTime: now.getTime(),
      lastVisitTime: now.getTime(),
      visitCount: 1,
      memos: []  // 新增备忘录数组
    });
  }
  
  await saveData();
});

// 初始化加载数据
loadData();