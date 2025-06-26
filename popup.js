document.addEventListener('DOMContentLoaded', async function() {
  const timeRangeSelect = document.getElementById('timeRange');
  const customRangeDiv = document.getElementById('customRange');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const exportBtn = document.getElementById('exportBtn');
  const outputTextarea = document.getElementById('output');
  const memoInput = document.getElementById('memoInput');
  const saveMemoBtn = document.getElementById('saveMemoBtn');
  const currentUrlInfo = document.getElementById('currentUrlInfo');
  
  let currentTab = null;
  
  // 获取当前标签页
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      currentTab = tabs[0];
      updateCurrentUrlInfo(currentTab.url, currentTab.title);
    }
  });
  
  // 更新当前URL信息
  async function updateCurrentUrlInfo(url, title) {
    currentUrlInfo.innerHTML = `
      <p><strong>标题:</strong> ${title || '无标题'}</p>
      <p><strong>URL:</strong> ${url}</p>
    `;
  }
  
  // 设置日期输入默认值
  const today = new Date();
  endDateInput.valueAsDate = today;
  startDateInput.valueAsDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // 显示/隐藏自定义日期范围
  timeRangeSelect.addEventListener('change', function() {
    customRangeDiv.classList.toggle('hidden', this.value !== 'custom');
  });
  
  // 保存备忘录
  saveMemoBtn.addEventListener('click', async function() {
    if (!currentTab || !memoInput.value.trim()) return;
    
    const memoText = memoInput.value.trim();
    const now = new Date();
    
    // 加载现有数据
    const result = await chrome.storage.local.get('historyData');
    const historyData = result.historyData || [];
    
    // 查找或创建当前URL的记录
    const urlIndex = historyData.findIndex(item => item.url === currentTab.url);
    
    if (urlIndex >= 0) {
      // 添加备忘录
      if (!historyData[urlIndex].memos) {
        historyData[urlIndex].memos = [];
      }
      historyData[urlIndex].memos.push({
        text: memoText,
        created: now.getTime()
      });
    } else {
      // 创建新记录
      historyData.push({
        url: currentTab.url,
        title: currentTab.title || currentTab.url,
        firstVisitTime: now.getTime(),
        lastVisitTime: now.getTime(),
        visitCount: 1,
        memos: [{
          text: memoText,
          created: now.getTime()
        }]
      });
    }
    
    // 保存数据
    await chrome.storage.local.set({ historyData });
    memoInput.value = '';
    alert('备忘录已保存！');
  });
  
  // 导出按钮点击事件
  exportBtn.addEventListener('click', async function() {
    const range = timeRangeSelect.value;
    let startTime, endTime = Date.now();
    
    switch(range) {
      case 'today':
        startTime = getStartOfDay();
        break;
      case '3days':
        startTime = Date.now() - 3 * 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'custom':
        startTime = startDateInput.valueAsDate.getTime();
        endTime = endDateInput.valueAsDate.getTime() + 24 * 60 * 60 * 1000; // 包含结束日期的全天
        break;
    }
    
    // 获取并处理历史记录
    const historyData = await getHistoryData(startTime, endTime);
    const mdContent = generateMarkdown(historyData);
    
    outputTextarea.value = mdContent;
    
    // 复制到剪贴板
    outputTextarea.select();
    document.execCommand('copy');
    alert('Markdown内容已复制到剪贴板！');
  });
  
  // 获取指定时间范围内的历史记录
  async function getHistoryData(startTime, endTime) {
    const result = await chrome.storage.local.get('historyData');
    const allHistory = result.historyData || [];
    
    return allHistory.filter(item => {
      return item.lastVisitTime >= startTime && item.lastVisitTime <= endTime;
    }).sort((a, b) => b.lastVisitTime - a.lastVisitTime);
  }
  
  // 生成Markdown格式内容
  function generateMarkdown(historyItems) {
    let md = `# 浏览历史记录\n\n`;
    md += `> 导出时间: ${new Date().toLocaleString()}\n\n`;
    
    if (historyItems.length === 0) {
      md += '没有找到历史记录\n';
      return md;
    }
    
    // 第一部分：摘要表格
    md += '## 浏览摘要\n\n';
    md += '| 标题 | 网址 | 最后访问时间 | 访问次数 | 备忘录数量 |\n';
    md += '|------|------|--------------|----------|------------|\n';
    
    for (const item of historyItems) {
      const title = item.title || item.url;
      const date = new Date(item.lastVisitTime).toLocaleString();
      const memoCount = item.memos ? item.memos.length : 0;
      
      md += `| ${title} | ${item.url} | ${date} | ${item.visitCount} | ${memoCount} |\n`;
    }
    
    // 第二部分：详细备忘录
    md += '\n## 浏览详情\n\n';
    
    for (const item of historyItems) {
      if (!item.memos || item.memos.length === 0) continue;
      
      md += `### ${item.title || item.url}\n`;
      md += `**URL:** ${item.url}\n\n`;
      md += `**最后访问时间:** ${new Date(item.lastVisitTime).toLocaleString()}\n\n`;
      md += `**访问次数:** ${item.visitCount}\n\n`;
      
      md += '#### 备忘录:\n';
      for (const memo of item.memos) {
        md += `- ${new Date(memo.created).toLocaleString()}:\n`;
        md += `  ${memo.text.replace(/\n/g, '\n  ')}\n\n`;
      }
      
      md += '---\n\n';
    }
    
    return md;
  }
  
  // 获取当天开始时间
  function getStartOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
});