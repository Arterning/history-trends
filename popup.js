document.addEventListener('DOMContentLoaded', async function() {
  const timeRangeSelect = document.getElementById('timeRange');
  const customRangeDiv = document.getElementById('customRange');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const exportBtn = document.getElementById('exportBtn');
  const outputTextarea = document.getElementById('output');
  
  // 设置日期输入默认值
  const today = new Date();
  endDateInput.valueAsDate = today;
  startDateInput.valueAsDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // 显示/隐藏自定义日期范围
  timeRangeSelect.addEventListener('change', function() {
    customRangeDiv.classList.toggle('hidden', this.value !== 'custom');
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
    
    md += '| 标题 | 网址 | 最后访问时间 | 访问次数 |\n';
    md += '|------|------|--------------|----------|\n';
    
    for (const item of historyItems) {
      const title = item.title || item.url;
      const date = new Date(item.lastVisitTime).toLocaleString();
      
      md += `| ${title} | ${item.url} | ${date} | ${item.visitCount} |\n`;
    }
    
    return md;
  }
  
  // 获取当天开始时间
  function getStartOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
});