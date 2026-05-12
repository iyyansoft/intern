export function extractUncompletedTargets(targetStr, dailyProgresses) {
  if (!targetStr || typeof targetStr !== 'string') return [];
  
  // Split target string into sub-tasks heuristically (primarily by semicolon or newline)
  const separators = /;|\band\b/i;
  const rawTasks = targetStr.split(separators).flatMap(s => s.split('\n'));
  
  const tasks = rawTasks.map(s => s.trim()).filter(s => s.length > 0);
  let uncompleted = [];

  // Combine all daily progress texts into one string
  const combinedProgress = dailyProgresses.join(' ').toLowerCase();

  for (const task of tasks) {
    const words = task.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 0 && !['with', 'this', 'that', 'then', 'from', 'into', 'learn', 'create', 'build', 'using'].includes(w));
    
    // If we have no significant words (after filtering common ones), 
    // but the task string itself has content, let's just use the task words
    const significantWords = words.length > 0 ? words : task.toLowerCase().split(/\s+/).filter(Boolean);
    if (significantWords.length === 0) continue;

    let matchedCount = 0;
    for (const word of significantWords) {
      if (combinedProgress.includes(word)) {
        matchedCount++;
      }
    }

    // If less than half of the key words are mentioned, mark as uncompleted
    const matchRatio = matchedCount / words.length;
    if (matchRatio < 0.5) {
      // Recursively strip any previous "Rolled over from..." prefixes and symbols
      let cleanTask = task;
      while (cleanTask.match(/Rolled over from.*?:/i)) {
        cleanTask = cleanTask.replace(/Rolled over from.*?:/i, '').trim();
      }
      cleanTask = cleanTask.replace(/^[- \t*:]+/, '').trim();
      const neatTask = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1);
      uncompleted.push(neatTask);
    }
  }

  return uncompleted;
}

export function extractCompletedCount(periods) {
  if (!periods) return 0;
  
  const allPeriods = Object.values(periods);
  let totalMatches = 0;
  
  // Combine all progress text to match against all tasks globally
  const combinedProgress = allPeriods.flatMap(p => p.days ? Object.values(p.days).map(d => d.progress).filter(Boolean) : []).join(' ').toLowerCase();

  for (const period of allPeriods) {
    if (!period.target) continue;
    
    // Split by semicolon or newline (Ignore commas)
    const separators = /;|\band\b/i;
    const tasks = period.target.split(separators).flatMap(s => s.split('\n')).map(s => s.trim()).filter(s => s.length > 0);
    
    for (const task of tasks) {
      const words = task.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(w => w.length > 0 && !['with', 'this', 'that', 'then', 'from', 'into', 'learn', 'create', 'build', 'using', 'from', 'week'].includes(w));
      
      const significantWords = words.length > 0 ? words : task.toLowerCase().split(/\s+/).filter(Boolean);
      if (significantWords.length === 0) continue;
      
      let matchedCount = 0;
      for (const word of significantWords) {
        if (combinedProgress.includes(word)) {
          matchedCount++;
        }
      }
      
      // If at least half of the significant words match, count it as a completed task
      if (significantWords.length > 0 && matchedCount / significantWords.length >= 0.5) {
        totalMatches++;
      }
    }
  }
  return totalMatches;
}
