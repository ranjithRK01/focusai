const API_BASE_URL = 'http://localhost:3000'

// Store the current watchHistoryId so we can update progress and end events
let currentWatchHistoryId: string | null = null
// Store active timers: key is tabId, value is { remainingMs: number, intervalId: number }
const activeTimers: Record<number, { remainingMs: number; intervalId: number; videoId: string }> = {}

console.log('🎯 FocusAI background script loaded!')

chrome.runtime.onInstalled.addListener(() => {
  console.log('FocusAI extension installed!')
})

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  console.log('📨 Background received message:', message.type)
  
  if (message.type === 'WATCH_START') {
    saveWatchStart(message.payload).then(response => {
      if (response.success && response.data) {
        currentWatchHistoryId = response.data._id
      }
      sendResponse(response)
    })
    return true
  }
  
  if (message.type === 'WATCH_PROGRESS') {
    saveWatchProgress(message.payload).then(response => {
      sendResponse(response)
    })
    return true
  }
  
  if (message.type === 'WATCH_END') {
    saveWatchEnd(message.payload).then(response => {
      currentWatchHistoryId = null
      sendResponse(response)
    })
    return true
  }
  
  if (message.type === 'PREDICT') {
    predictVideo(message.payload).then(response => {
      sendResponse(response)
    })
    return true
  }
  
  if (message.type === 'SKIP_VIDEO') {
    handleSkipVideo(message.payload).then(response => {
      sendResponse(response)
    })
    return true
  }
  
  if (message.type === 'IGNORE_RECOMMENDATION') {
    handleIgnoreRecommendation(message.payload).then(response => {
      sendResponse(response)
    })
    return true
  }
  
  if (message.type === 'START_TIMER') {
    handleStartTimer(message.payload, sender).then(response => {
      sendResponse(response)
    })
    return true
  }
  
  if (message.type === 'EXTEND_TIMER') {
    handleExtendTimer(message.payload, sender).then(response => {
      sendResponse(response)
    })
    return true
  }
  
  if (message.type === 'CANCEL_TIMER') {
    handleCancelTimer(sender.tab?.id)
    sendResponse({ success: true })
    return true
  }
  
  return true
})

// Handle tab closure to clean up timers
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTimers[tabId]) {
    clearInterval(activeTimers[tabId].intervalId)
    delete activeTimers[tabId]
  }
})

async function handleSkipVideo(payload: any): Promise<any> {
  try {
    // Send skip action to API
    await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'skip',
        title: payload.videoTitle,
        channel: payload.videoChannel,
        url: payload.videoUrl,
        predictionId: payload.predictionId,
        predictionReason: payload.predictionReason
      })
    })
    
    return { success: true }
  } catch (e) {
    console.error('Error in skip video:', e)
    return { success: false, error: String(e) }
  }
}

async function handleIgnoreRecommendation(payload: any): Promise<any> {
  try {
    await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'ignore',
        title: payload.videoTitle,
        channel: payload.videoChannel,
        url: payload.videoUrl,
        predictionId: payload.predictionId
      })
    })
    
    return { success: true }
  } catch (e) {
    console.error('Error in ignore recommendation:', e)
    return { success: false, error: String(e) }
  }
}

async function handleStartTimer(payload: any, sender: any): Promise<any> {
  const tabId = sender.tab?.id
  if (!tabId) {
    return { success: false, error: 'No tab ID' }
  }
  
  // Clear any existing timer for this tab
  if (activeTimers[tabId]) {
    clearInterval(activeTimers[tabId].intervalId)
  }
  
  const durationMs = payload.durationMs || 5 * 60 * 1000 // Default 5 minutes
  let remainingMs = durationMs
  
  const intervalId = setInterval(() => {
    remainingMs -= 1000
    
    // Send update to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'TIMER_UPDATE',
      payload: { remainingMs }
    })
    
    if (remainingMs <= 0) {
      clearInterval(intervalId)
      delete activeTimers[tabId]
      
      // Notify content script that timer expired
      chrome.tabs.sendMessage(tabId, {
        type: 'TIMER_EXPIRED'
      })
    }
  }, 1000)
  
  activeTimers[tabId] = {
    remainingMs,
    intervalId,
    videoId: payload.videoId
  }
  
  return { success: true }
}

async function handleExtendTimer(payload: any, sender: any): Promise<any> {
  const tabId = sender.tab?.id
  if (!tabId || !activeTimers[tabId]) {
    return { success: false, error: 'No active timer' }
  }
  
  const extendMs = payload.extendMs || 5 * 60 * 1000 // Default 5 more minutes
  activeTimers[tabId].remainingMs += extendMs
  
  return { success: true }
}

function handleCancelTimer(tabId: number | undefined) {
  if (tabId && activeTimers[tabId]) {
    clearInterval(activeTimers[tabId].intervalId)
    delete activeTimers[tabId]
  }
}

async function predictVideo(videoInfo: any): Promise<any> {
  try {
    console.log('🔮 Background: Calling predict API for:', videoInfo.title)
    const url = `${API_BASE_URL}/api/predict?title=${encodeURIComponent(videoInfo.title)}&channel=${encodeURIComponent(videoInfo.channel.name)}&url=${encodeURIComponent(videoInfo.url)}`
    console.log('🔮 Background: Fetch URL:', url)
    
    const response = await fetch(url, { credentials: 'include' })
    console.log('🔮 Background: API response status:', response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log('🔮 Background: API result:', result)
      return { success: true, data: result.data }
    } else {
      const errorText = await response.text()
      console.error('🔮 Background: API error:', errorText)
      return { success: false, error: `API call failed with status ${response.status}: ${errorText}` }
    }
  } catch (e) {
    console.error('Error in predict API call:', e)
    return { success: false, error: String(e) }
  }
}

async function saveWatchStart(videoInfo: any): Promise<any> {
  try {
    console.log('📤 Sending watch start to server:', videoInfo)
    
    const response = await fetch(`${API_BASE_URL}/api/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        eventType: 'start',
        videoUrl: videoInfo.url,
        videoTitle: videoInfo.title,
        channelName: videoInfo.channel.name,
        channelUrl: videoInfo.channel.url,
        duration: videoInfo.duration,
        videoId: videoInfo.videoId
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Watch start saved:', result)
      return { success: true, data: result.data }
    } else {
      const errorText = await response.text()
      console.error('❌ Failed to save watch start:', response.status, errorText)
      return { success: false, error: `API call failed with ${response.status}` }
    }
  } catch (e) {
    console.error('Error in watch start API call:', e)
    return { success: false, error: String(e) }
  }
}

async function saveWatchProgress(videoInfo: any): Promise<any> {
  if (!currentWatchHistoryId) {
    console.log('⚠️ No watchHistoryId, skipping progress update')
    return { success: false, error: 'No watch history ID' }
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        eventType: 'progress',
        watchHistoryId: currentWatchHistoryId,
        watchedDuration: videoInfo.watchedDuration,
        percentageWatched: videoInfo.percentageWatched
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return { success: true, data: result.data }
    } else {
      return { success: false, error: 'API call failed' }
    }
  } catch (e) {
    console.error('Error in watch progress API call:', e)
    return { success: false, error: String(e) }
  }
}

async function saveWatchEnd(videoInfo: any): Promise<any> {
  if (!currentWatchHistoryId) {
    console.log('⚠️ No watchHistoryId, skipping end event')
    return { success: false, error: 'No watch history ID' }
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        eventType: 'end',
        watchHistoryId: currentWatchHistoryId,
        watchedDuration: videoInfo.watchedDuration,
        percentageWatched: videoInfo.percentageWatched
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Watch end saved:', result)
      return { success: true, data: result.data }
    } else {
      return { success: false, error: 'API call failed' }
    }
  } catch (e) {
    console.error('Error in watch end API call:', e)
    return { success: false, error: String(e) }
  }
}
