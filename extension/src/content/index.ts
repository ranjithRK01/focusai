import './index.css'

console.log('🎯 FocusAI content script loaded!')

// --- State Variables ---
let currentVideoId: string | null = null
let isTracking = false
let watchStartTime: number | null = null
let lastProgressUpdate = 0
let videoElement: HTMLVideoElement | null = null
let currentPredictionData: any = null
let currentVideoInfo: any = null
let floatingTimerElement: HTMLDivElement | null = null

// New state variables for goal reflection!
let consecutiveIgnores = 0 // Track consecutive "Watch Anyway" clicks
const approvedVideoIds = new Set<string>() // Track videos user has approved

// --- Reflection Questions and Choices ---
const REFLECTION_QUESTIONS = [
  {
    question: "How will this video help your goal?",
    choices: [
      "It directly teaches my goal",
      "It's related knowledge",
      "I'm intentionally taking a short break",
      "It's only entertainment"
    ]
  },
  {
    question: "What do you expect to gain from watching this?",
    choices: [
      "New skills",
      "Useful information",
      "Relaxation",
      "Just passing time"
    ]
  },
  {
    question: "If you watch this now, what are you delaying?",
    choices: [
      "Today's learning goal",
      "Nothing important",
      "My planned study session",
      "I'm not sure"
    ]
  },
  {
    question: "Would your future self thank you for watching this?",
    choices: [
      "Yes",
      "Probably",
      "Probably not",
      "No"
    ]
  }
]

const MOTIVATIONAL_TOASTS = [
  "🎉 Nice choice!",
  "🔥 Every focused decision counts.",
  "💪 Small choices build big results.",
  "🚀 You're getting closer to your goal.",
  "⏳ You just protected your learning time."
]

// --- Helper Functions ---
const getVideoIdFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('v')
}

const getVideoInfo = (): any => {
  const videoId = getVideoIdFromUrl()
  console.log('🎯 getVideoInfo(): videoId from URL:', videoId)

  if (!videoId) {
    console.log('🎯 getVideoInfo(): NO VIDEO ID, returning null')
    return null
  }
  
  // Get title - try multiple selectors
  let title = 'Unknown Title'
  const titleEl1 = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')
  const titleEl2 = document.querySelector('h1.title yt-formatted-string')
  if (titleEl1) title = titleEl1.textContent || 'Unknown Title'
  else if (titleEl2) title = titleEl2.textContent || 'Unknown Title'
  console.log('🎯 getVideoInfo(): title:', title)
  
  // Get channel info
  let channelName = 'Unknown Channel'
  let channelUrl = ''
  const channelNameEl1 = document.querySelector('#channel-name yt-formatted-string')
  const channelNameEl2 = document.querySelector('.ytd-channel-name yt-formatted-string')
  const channelUrlEl1 = document.querySelector('#channel-name a')
  const channelUrlEl2 = document.querySelector('.ytd-channel-name a')
  
  if (channelNameEl1) channelName = channelNameEl1.textContent || 'Unknown Channel'
  else if (channelNameEl2) channelName = channelNameEl2.textContent || 'Unknown Channel'
  if (channelUrlEl1) channelUrl = (channelUrlEl1 as HTMLAnchorElement).href
  else if (channelUrlEl2) channelUrl = (channelUrlEl2 as HTMLAnchorElement).href
  console.log('🎯 getVideoInfo(): channel:', channelName, channelUrl)
  
  // Get duration
  let durationInSeconds = 0
  const durationEl = document.querySelector('.ytp-time-duration')
  if (durationEl) {
    const parts = (durationEl.textContent || '0:00').split(':').reverse()
    parts.forEach((part, index) => {
      durationInSeconds += parseInt(part) * Math.pow(60, index)
    })
  }
  console.log('🎯 getVideoInfo(): duration:', durationInSeconds)
  
  const videoInfo = {
    videoId,
    title,
    url: window.location.href,
    channel: {
      name: channelName,
      url: channelUrl,
    },
    duration: durationInSeconds,
  }
  console.log('🎯 getVideoInfo(): returning:', videoInfo)
  return videoInfo
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

const formatTimeSaved = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  }
  return `${remainingMinutes}m`
}

const pauseVideo = () => {
  if (videoElement && !videoElement.paused) {
    videoElement.pause()
  }
}

const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)]
}

// --- Metric Helper Functions ---
const METRICS_STORAGE_KEY = 'focusai_metrics'

const createDefaultMetrics = () => {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - day + (day === 0 ? -6 : 1))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return {
    daily: {
      date: today, focusMinutes: 0, learningVideosWatched: 0,
      distractingVideosDetected: 0, distractingVideosSkipped: 0,
      videosWatchedAfterReminder: 0, timeSaved: 0,
      goalCompletionPercentage: 0, focusScore: 0,
    },
    weekly: {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalFocusHours: 0, totalSavedHours: 0, productiveVideosWatched: 0,
      distractionsAvoided: 0, longestFocusSession: 0,
    },
    lifetime: {
      totalFocusTime: 0, totalDistractionTimePrevented: 0,
      totalProductiveVideos: 0, totalSkippedDistractions: 0,
      totalGoalsCompleted: 0, longestStreak: 0, currentStreak: 0,
      bestFocusDay: null, averageDailyFocusTime: 0,
    },
  }
}

const getMetrics = async () => {
  const stored = await chrome.storage.local.get(METRICS_STORAGE_KEY)
  return stored[METRICS_STORAGE_KEY] || createDefaultMetrics()
}

const updateMetrics = async (updateFn: (metrics: any) => Partial<any>) => {
  const currentMetrics = await getMetrics()
  const updates = updateFn(currentMetrics)
  await chrome.storage.local.set({
    [METRICS_STORAGE_KEY]: {
      ...currentMetrics,
      ...updates,
      daily: { ...currentMetrics.daily, ...updates.daily },
      weekly: { ...currentMetrics.weekly, ...updates.weekly },
      lifetime: { ...currentMetrics.lifetime, ...updates.lifetime },
    },
  })
}

const recordDistractingVideoDetected = async () => {
  await updateMetrics(m => ({
    daily: { ...m.daily, distractingVideosDetected: m.daily.distractingVideosDetected + 1 }
  }))
}

const recordDistractingVideoSkipped = async (timeSavedMinutes: number) => {
  await updateMetrics(m => {
    // Calculate new streak
    let newCurrentStreak = m.lifetime.currentStreak + 1
    let newLongestStreak = Math.max(m.lifetime.longestStreak, newCurrentStreak)
    
    return {
      daily: {
        ...m.daily,
        distractingVideosSkipped: m.daily.distractingVideosSkipped + 1,
        timeSaved: m.daily.timeSaved + timeSavedMinutes
      },
      weekly: {
        ...m.weekly,
        distractionsAvoided: m.weekly.distractionsAvoided + 1,
        totalSavedHours: m.weekly.totalSavedHours + (timeSavedMinutes / 60)
      },
      lifetime: {
        ...m.lifetime,
        totalDistractionTimePrevented: m.lifetime.totalDistractionTimePrevented + timeSavedMinutes,
        totalSkippedDistractions: m.lifetime.totalSkippedDistractions + 1,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak
      }
    }
  })
}

const recordVideoWatchedAfterReminder = async () => {
  await updateMetrics(m => ({
    daily: {
      ...m.daily,
      videosWatchedAfterReminder: m.daily.videosWatchedAfterReminder + 1
    }
  }))
}

const recordLearningVideoWatched = async (focusMinutes: number) => {
  await updateMetrics(m => {
    // Check for best focus day
    let newBestFocusDay = m.lifetime.bestFocusDay
    const newDailyFocusMinutes = m.daily.focusMinutes + focusMinutes
    if (!newBestFocusDay || newDailyFocusMinutes > newBestFocusDay.focusMinutes) {
      newBestFocusDay = { date: new Date().toISOString().split('T')[0], focusMinutes: newDailyFocusMinutes }
    }
    
    // Calculate new average daily focus time
    const totalDaysWithFocus = (m.lifetime.bestFocusDay ? 1 : 0) + 1
    const totalFocusTime = m.lifetime.totalFocusTime + focusMinutes
    const newAverageDailyFocusTime = totalFocusTime / totalDaysWithFocus
    
    return {
      daily: {
        ...m.daily,
        focusMinutes: newDailyFocusMinutes,
        learningVideosWatched: m.daily.learningVideosWatched + 1
      },
      weekly: {
        ...m.weekly,
        totalFocusHours: m.weekly.totalFocusHours + (focusMinutes / 60),
        productiveVideosWatched: m.weekly.productiveVideosWatched + 1
      },
      lifetime: {
        ...m.lifetime,
        totalFocusTime: totalFocusTime,
        totalProductiveVideos: m.lifetime.totalProductiveVideos + 1,
        bestFocusDay: newBestFocusDay,
        averageDailyFocusTime: newAverageDailyFocusTime
      }
    }
  })
}



// --- Floating Badge ---
const createFloatingBadge = (text: string, color: string = '#10b981', durationMs: number = 2000) => {
  // Clean up existing badge
  const existingBadge = document.getElementById('focusai-badge')
  if (existingBadge) existingBadge.remove()

  const badge = document.createElement('div')
  badge.id = 'focusai-badge'
  badge.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    max-width: min(420px, calc(100vw - 32px));
    background: ${color};
    color: white;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 2147483647;
    animation: fadeInOut ${durationMs}ms ease-in-out;
  `
  badge.textContent = text
  
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -42%); }
      15% { opacity: 1; transform: translate(-50%, -50%); }
      85% { opacity: 1; transform: translate(-50%, -50%); }
      100% { opacity: 0; transform: translate(-50%, -58%); }
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(badge)
  
  setTimeout(() => {
    badge.remove()
    style.remove()
  }, durationMs)
}

// --- Celebration Modal ---
const createCelebrationModal = async (durationMinutes: number, callback: () => void) => {
  const existingPopup = document.getElementById('focusai-prediction-popup')
  const existingBackdrop = document.getElementById('focusai-backdrop')
  if (existingPopup) existingPopup.remove()
  if (existingBackdrop) existingBackdrop.remove()

  const backdrop = document.createElement('div')
  backdrop.id = 'focusai-backdrop'
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(3px);
    z-index: 2147483646;
    animation: fadeIn 0.2s ease-out;
  `

  const popup = document.createElement('div')
  popup.id = 'focusai-prediction-popup'
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 32px;
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    z-index: 2147483647;
    max-width: 440px;
    width: 90%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: scaleIn 0.3s ease-out;
    text-align: center;
  `

  const metrics = await getMetrics()
  const streak = metrics.lifetime.currentStreak
  const timeSaved = metrics.lifetime.totalDistractionTimePrevented
  const skippedVideos = metrics.lifetime.totalSkippedDistractions

  popup.innerHTML = `
    <div style="font-size: 80px; margin-bottom: 16px;">🎉</div>
    <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">Great choice!</h2>
    <p style="color: #334155; margin-bottom: 8px; font-size: 16px;">You just protected <strong>${durationMinutes} minutes</strong> of your learning journey.</p>
    <p style="color: #64748b; margin-bottom: 24px; font-size: 14px;">Keep building your streak! 🚀</p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%); padding: 14px 10px; border-radius: 14px; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #10b981; line-height: 1;">${streak}</div>
        <div style="font-size: 11px; font-weight: 600; color: #0f766e; margin-top: 4px;">Day Streak</div>
      </div>
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 14px 10px; border-radius: 14px; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #d97706; line-height: 1;">${formatTimeSaved(timeSaved)}</div>
        <div style="font-size: 11px; font-weight: 600; color: #92400e; margin-top: 4px;">Total Saved</div>
      </div>
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 14px 10px; border-radius: 14px; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #3b82f6; line-height: 1;">${skippedVideos}</div>
        <div style="font-size: 11px; font-weight: 600; color: #1e40af; margin-top: 4px;">Videos</div>
      </div>
    </div>
    <div style="opacity: 0.8; font-size: 14px; color: #64748b;">Redirecting in <span id="countdown">2</span>s...</div>
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(backdrop)
  document.body.appendChild(popup)

  let countdown = 2
  const countdownEl = document.getElementById('countdown')
  const interval = setInterval(() => {
    countdown--
    if (countdownEl) countdownEl.textContent = countdown.toString()
    if (countdown <= 0) {
      clearInterval(interval)
      popup.remove()
      backdrop.remove()
      style.remove()
      callback()
    }
  }, 1000)
}

// --- Goal Reflection Modal ---
const createGoalReflectionModal = async (
  predictionData: any,
  onContinueLearning: () => void,
  onWatch5Minutes: () => void,
  onWatchAnyway: () => void,
  isPausePrompt = false
) => {
  const goal = predictionData.goalSnapshot || 'your goal'
  const videoDecision = predictionData.decision
  const videoDurationSeconds = (currentVideoInfo?.duration || 0)

  // Record that we detected a distracting video
  if (!isPausePrompt && videoDecision === 'DISTRACTING') {
    await recordDistractingVideoDetected()
  }

  // Clean up existing elements
  const existingPopup = document.getElementById('focusai-prediction-popup')
  const existingBackdrop = document.getElementById('focusai-backdrop')
  if (existingPopup) existingPopup.remove()
  if (existingBackdrop) existingBackdrop.remove()

  // Create backdrop
  const backdrop = document.createElement('div')
  backdrop.id = 'focusai-backdrop'
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(3px);
    z-index: 2147483646;
    animation: fadeIn 0.2s ease-out;
  `

  // Create popup
  const popup = document.createElement('div')
  popup.id = 'focusai-prediction-popup'
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 32px;
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    z-index: 2147483647;
    max-width: 440px;
    width: 90%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: scaleIn 0.2s ease-out;
  `

  if (isPausePrompt) {
    popup.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 56px; margin-bottom: 12px;">🔍</div>
        <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Focus Check</div>
        <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">You're on a roll!</h2>
        <p style="color: #475569; margin-bottom: 28px; font-size: 15px; line-height: 1.6;">
          You've chosen several distraction videos. Would you like to take a 30-minute pause?
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="focusai-stay-btn" style="
            width: 100%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(16,185,129,0.35);
          ">Stay on Track</button>
          <button id="focusai-pause-btn" style="
            width: 100%;
            background: #f1f5f9;
            color: #334155;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Take a Break</button>
        </div>
      </div>
    `
  } else {
    const insight = videoDecision === 'DISTRACTING'
      ? "This doesn't contribute to your goal right now."
      : "Let's make sure this moves you forward."

    const metrics = await getMetrics()

    popup.innerHTML = `
      <div>
        <!-- Goal Card -->
        <div style="background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%); border-radius: 18px; padding: 20px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 18px;">🎯</span>
            <span style="font-size: 12px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 1px;">Current Goal</span>
          </div>
          <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.4;">
            ${goal}
          </p>
        </div>

        <!-- Insight -->
        <div style="text-align: center; margin-bottom: 16px;">
          <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0;">
            ${insight}
          </p>
          <p style="color: #64748b; margin-top: 8px; font-size: 14px;">Watching it will cost approximately ${formatDuration(videoDurationSeconds)} of focused learning time.</p>
        </div>

        <!-- Progress Summary -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px;">
          <div style="background: #f8fafc; padding: 14px 10px; border-radius: 14px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #10b981; line-height: 1;">${metrics.lifetime.currentStreak}</div>
            <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px;">Day Streak</div>
          </div>
          <div style="background: #f8fafc; padding: 14px 10px; border-radius: 14px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #3b82f6; line-height: 1;">${formatTimeSaved(metrics.lifetime.totalDistractionTimePrevented)}</div>
            <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px;">Total Saved</div>
          </div>
          <div style="background: #f8fafc; padding: 14px 10px; border-radius: 14px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #f59e0b; line-height: 1;">${metrics.lifetime.totalSkippedDistractions}</div>
            <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px;">Videos</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="focusai-continue-learning-btn" style="
            width: 100%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(16,185,129,0.35);
          ">Continue Learning</button>
          
          <button id="focusai-timer-btn" style="
            width: 100%;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(245,158,11,0.35);
          ">Watch for 5 Minutes</button>
          
          <button id="focusai-watch-anyway-btn" style="
            width: 100%;
            background: #f1f5f9;
            color: #475569;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Continue to Video</button>
        </div>
      </div>
    `
  }

  // Add animation styles
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    #focusai-continue-learning-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }
    #focusai-timer-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,158,11,0.45); }
    #focusai-watch-anyway-btn:hover { background: #e2e8f0; }
    #focusai-stay-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }
    #focusai-pause-btn:hover { background: #e2e8f0; }
    .focusai-option-btn:hover { background: #f8fafc; border-color: #d1d5db; }
    .focusai-option-btn.selected { background: #dbeafe; border-color: #3b82f6; color: #1e40af; }
  `
  document.head.appendChild(style)

  if (isPausePrompt) {
    popup.querySelector('#focusai-pause-btn')?.addEventListener('click', () => {
      // TODO: Implement pause focus mode
      popup.remove()
      backdrop.remove()
      style.remove()
      createFloatingBadge('Focus Mode paused for 30 minutes', '#3b82f6')
    })

    popup.querySelector('#focusai-stay-btn')?.addEventListener('click', async () => {
      consecutiveIgnores = 0
      popup.remove()
      backdrop.remove()
      style.remove()
      onContinueLearning()
    })
  } else {
    // Add listeners
    popup.querySelector('#focusai-continue-learning-btn')?.addEventListener('click', async () => {
      popup.remove()
      backdrop.remove()
      style.remove()
      consecutiveIgnores = 0
      const durationMinutes = Math.round((currentVideoInfo?.duration / 60) || 0)
      await recordDistractingVideoSkipped(durationMinutes)
      
      createCelebrationModal(durationMinutes, () => {
        onContinueLearning()
      })
    })

    popup.querySelector('#focusai-timer-btn')?.addEventListener('click', async () => {
      popup.remove()
      backdrop.remove()
      style.remove()
      consecutiveIgnores = 0
      await recordVideoWatchedAfterReminder()
      onWatch5Minutes()
    })

    popup.querySelector('#focusai-watch-anyway-btn')?.addEventListener('click', async () => {
      // Show reflection question first
      popup.remove()
      backdrop.remove()
      style.remove()
      await recordVideoWatchedAfterReminder()
      createReflectionQuestionModal(onWatchAnyway)
    })
  }

  document.body.appendChild(backdrop)
  document.body.appendChild(popup)
}

// --- Reflection Question Modal ---
const createReflectionQuestionModal = (onAllow: () => void) => {
  const questionData = getRandomItem(REFLECTION_QUESTIONS)
  
  const existingPopup = document.getElementById('focusai-prediction-popup')
  const existingBackdrop = document.getElementById('focusai-backdrop')
  if (existingPopup) existingPopup.remove()
  if (existingBackdrop) existingBackdrop.remove()

  const backdrop = document.createElement('div')
  backdrop.id = 'focusai-backdrop'
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(3px);
    z-index: 2147483646;
    animation: fadeIn 0.2s ease-out;
  `

  const popup = document.createElement('div')
  popup.id = 'focusai-prediction-popup'
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 32px;
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    z-index: 2147483647;
    max-width: 440px;
    width: 90%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: scaleIn 0.2s ease-out;
  `

  popup.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">💭</div>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 20px 0;">
        ${questionData.question}
      </h2>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
        ${questionData.choices.map((choice, i) => `
          <button class="focusai-option-btn" data-choice="${i}" style="
            width: 100%;
            background: white;
            color: #334155;
            border: 1px solid #e2e8f0;
            padding: 14px 20px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: left;
          ">${choice}</button>
        `).join('')}
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="focusai-continue-btn" style="
          width: 100%;
          background: #f1f5f9;
          color: #64748b;
          border: none;
          padding: 16px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        " disabled>Continue to Video</button>
      </div>
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    .focusai-option-btn:hover { background: #f8fafc; border-color: #d1d5db; }
    .focusai-option-btn.selected { background: #dbeafe; border-color: #3b82f6; color: #1e40af; }
    #focusai-continue-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #focusai-continue-btn:not(:disabled):hover { background: #e2e8f0; }
  `
  document.head.appendChild(style)
  document.body.appendChild(backdrop)
  document.body.appendChild(popup)

  let selectedChoice: number | null = null
  const optionButtons = popup.querySelectorAll('.focusai-option-btn')
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      optionButtons.forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      selectedChoice = parseInt(btn.getAttribute('data-choice') || '-1')
      const continueBtn = document.getElementById('focusai-continue-btn') as HTMLButtonElement | null
      if (continueBtn) continueBtn.disabled = false
    })
  })

  document.getElementById('focusai-continue-btn')?.addEventListener('click', () => {
    if (selectedChoice !== null) {
      popup.remove()
      backdrop.remove()
      style.remove()
      consecutiveIgnores += 1
      if (currentVideoInfo?.videoId) {
        approvedVideoIds.add(currentVideoInfo.videoId)
      }
      onAllow()
    }
  })
}

// --- Timer Expired Modal ---
const createTimerExpiredModal = async (onContinueLearning: () => void, onExtend: () => void, onWatchAnyway: () => void) => {
  const existingPopup = document.getElementById('focusai-prediction-popup')
  const existingBackdrop = document.getElementById('focusai-backdrop')
  if (existingPopup) existingPopup.remove()
  if (existingBackdrop) existingBackdrop.remove()

  const backdrop = document.createElement('div')
  backdrop.id = 'focusai-backdrop'
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    z-index: 2147483646;
    animation: fadeIn 0.2s ease-out;
  `

  const popup = document.createElement('div')
  popup.id = 'focusai-prediction-popup'
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 32px;
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    z-index: 2147483647;
    max-width: 440px;
    width: 90%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: scaleIn 0.2s ease-out;
    text-align: center;
  `

  popup.innerHTML = `
    <div style="font-size: 56px; margin-bottom: 12px;">⏰</div>
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 20px 0;">Time's up.</h2>
    <p style="color: #64748b; margin-bottom: 24px; font-size: 15px;">Would you like to continue learning instead?</p>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <button id="focusai-continue-learning-expired-btn" style="
        width: 100%;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        padding: 16px;
        border-radius: 14px;
        font-size: 17px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 14px rgba(16,185,129,0.35);
      ">Continue Learning</button>
      <button id="focusai-extend-btn" style="
        width: 100%;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        border: none;
        padding: 16px;
        border-radius: 14px;
        font-size: 17px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 14px rgba(245,158,11,0.35);
      ">Watch Another 5 Minutes</button>
      <button id="focusai-watch-anyway-expired-btn" style="
        width: 100%;
        background: #f1f5f9;
        color: #475569;
        border: none;
        padding: 16px;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Continue to Video</button>
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    #focusai-continue-learning-expired-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }
    #focusai-extend-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,158,11,0.45); }
    #focusai-watch-anyway-expired-btn:hover { background: #e2e8f0; }
  `
  document.head.appendChild(style)

  popup.querySelector('#focusai-continue-learning-expired-btn')?.addEventListener('click', async () => {
    popup.remove()
    backdrop.remove()
    style.remove()
    consecutiveIgnores = 0
    const remainingDurationSeconds = (currentVideoInfo?.duration || 0) - (videoElement?.currentTime || 0)
    const durationMinutes = Math.round(remainingDurationSeconds / 60)
    await recordDistractingVideoSkipped(durationMinutes)
    createCelebrationModal(durationMinutes, onContinueLearning)
  })

  popup.querySelector('#focusai-extend-btn')?.addEventListener('click', () => {
    popup.remove()
    backdrop.remove()
    style.remove()
    consecutiveIgnores = 0
    onExtend()
  })

  popup.querySelector('#focusai-watch-anyway-expired-btn')?.addEventListener('click', () => {
    popup.remove()
    backdrop.remove()
    style.remove()
    if (currentVideoInfo?.videoId) {
      approvedVideoIds.add(currentVideoInfo.videoId)
    }
    onWatchAnyway()
  })

  document.body.appendChild(backdrop)
  document.body.appendChild(popup)
}

// --- Floating Timer ---
const createFloatingTimer = () => {
  if (floatingTimerElement) {
    floatingTimerElement.remove()
  }
  
  floatingTimerElement = document.createElement('div')
  floatingTimerElement.id = 'focusai-floating-timer'
  floatingTimerElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1f2937;
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 700;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 10px;
  `
  floatingTimerElement.innerHTML = `
    <span>⏱️</span>
    <span id="focusai-timer-text">5:00</span>
  `
  document.body.appendChild(floatingTimerElement)
}

const updateFloatingTimer = (remainingMs: number) => {
  const timerText = document.getElementById('focusai-timer-text')
  if (timerText) {
    const totalSeconds = Math.ceil(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
}

const removeFloatingTimer = () => {
  if (floatingTimerElement) {
    floatingTimerElement.remove()
    floatingTimerElement = null
  }
}

// --- Action Handlers ---
const handleContinueLearning = async () => {
  pauseVideo()
  
  // Save skip history
  await chrome.runtime.sendMessage({
    type: 'SKIP_VIDEO',
    payload: {
      videoTitle: currentVideoInfo.title,
      videoChannel: currentVideoInfo.channel.name,
      videoUrl: currentVideoInfo.url,
      predictionId: currentPredictionData?._id,
      predictionReason: currentPredictionData?.reason
    }
  })

  // Navigate to YouTube homepage
  window.location.href = "https://www.youtube.com/"
  
  createFloatingBadge(getRandomItem(MOTIVATIONAL_TOASTS), '#10b981', 2000)
}

const handleWatch5Minutes = async () => {
  createFloatingTimer()
  await chrome.runtime.sendMessage({
    type: 'START_TIMER',
    payload: {
      durationMs: 5 * 60 * 1000,
      videoId: currentVideoInfo.videoId
    }
  })
  createFloatingBadge('⏱️ 5 minute timer started!', '#f59e0b', 2000)
}

const handleWatchAnyway = async () => {
  await chrome.runtime.sendMessage({
    type: 'IGNORE_RECOMMENDATION',
    payload: {
      videoTitle: currentVideoInfo.title,
      videoChannel: currentVideoInfo.channel.name,
      videoUrl: currentVideoInfo.url,
      predictionId: currentPredictionData?._id
    }
  })
}

const handleExtendTimer = async () => {
  await chrome.runtime.sendMessage({
    type: 'EXTEND_TIMER',
    payload: {
      extendMs: 5 * 60 * 1000
    }
  })
  createFloatingBadge('⏱️ Timer extended 5 more minutes!', '#f59e0b', 2000)
}

// --- Video Tracking ---
const trackVideoPlayback = (video: HTMLVideoElement, videoInfo: any) => {
  console.log('🎥 Tracking video playback')
  
  video.addEventListener('play', () => {
    console.log('▶️ Video playing')
  })
  
  video.addEventListener('pause', () => {
    console.log('⏸️ Video paused')
  })
  
  video.addEventListener('timeupdate', () => {
    const now = Date.now()
    if (now - lastProgressUpdate > 15000) { // Every 15 seconds
      lastProgressUpdate = now
      sendWatchProgress(video, videoInfo)
    }
  })
  
  video.addEventListener('ended', () => {
    console.log('✅ Video ended')
    sendWatchEnd(video, videoInfo)
  })
}

const sendWatchStart = async (videoInfo: any) => {
  try {
    console.log('📤 Sending watch start...')
    watchStartTime = Date.now()
    const response = await chrome.runtime.sendMessage({
      type: 'WATCH_START',
      payload: videoInfo,
    })
    console.log('✅ Watch start response:', response)
  } catch (e) {
    console.error('❌ Error sending watch start:', e)
  }
}

const sendWatchProgress = async (video: HTMLVideoElement, videoInfo: any) => {
  try {
    const percentage = videoInfo.duration > 0 
      ? Math.round((video.currentTime / videoInfo.duration) * 100)
      : 0
    
    const response = await chrome.runtime.sendMessage({
      type: 'WATCH_PROGRESS',
      payload: {
        videoId: videoInfo.videoId,
        watchedDuration: video.currentTime,
        percentageWatched: percentage
      }
    })
    console.log('📊 Watch progress sent:', response)
  } catch (e) {
    console.error('❌ Error sending watch progress:', e)
  }
}

const sendWatchEnd = async (video: HTMLVideoElement, videoInfo: any) => {
  try {
    const watchedDuration = watchStartTime ? (Date.now() - watchStartTime) / 1000 : 0
    const percentageWatched = videoInfo.duration > 0 
      ? Math.round((video.currentTime / videoInfo.duration) * 100)
      : 0
    
    const response = await chrome.runtime.sendMessage({
      type: 'WATCH_END',
      payload: {
        videoId: videoInfo.videoId,
        watchedDuration,
        percentageWatched
      }
    })
    console.log('📤 Watch end sent:', response)
  } catch (e) {
    console.error('❌ Error sending watch end:', e)
  }
}

// --- Listen for Background Messages ---
chrome.runtime.onMessage.addListener(async (message: any) => {
  if (message.type === 'TIMER_UPDATE') {
    updateFloatingTimer(message.payload.remainingMs)
  } else if (message.type === 'TIMER_EXPIRED') {
    pauseVideo()
    removeFloatingTimer()
    await createTimerExpiredModal(
      handleContinueLearning,
      handleExtendTimer,
      handleWatchAnyway
    )
  }
})

// --- Main Tracking ---
const startTracking = async (videoInfo: any) => {
  if (isTracking) return
  
  isTracking = true
  currentVideoInfo = videoInfo
  console.log('📹 Started tracking video:', videoInfo)
  
  // Begin tracking immediately. Network classification must never delay the
  // playback listeners or progress updates.
  void sendWatchStart(videoInfo)

  const findAndTrackVideo = () => {
    const video = document.querySelector('video') as HTMLVideoElement | null
    if (video) {
      videoElement = video
      trackVideoPlayback(video, videoInfo)
    } else {
      setTimeout(findAndTrackVideo, 250)
    }
  }
  findAndTrackVideo()
  
  try {
    console.log('📤 Sending prediction request for video:', videoInfo)
    const response = await chrome.runtime.sendMessage({
      type: 'PREDICT',
      payload: videoInfo,
    })
    console.log('📥 Prediction response:', response)
    
    if (response.success) {
      currentPredictionData = response.data
      const { decision, goalSnapshot } = response.data
      console.log('🤖 Prediction decision:', decision)
      console.log('🤖 Prediction data:', currentPredictionData)
      
      // Check if we should show modal
      const shouldShowModal = 
        decision === 'DISTRACTING' && 
        goalSnapshot && 
        !approvedVideoIds.has(videoInfo.videoId)
      
      if (shouldShowModal) {
        console.log('🎯 Showing goal reflection modal!')
        pauseVideo()
        
        // Check if we should show the pause prompt instead
        const isPausePrompt = consecutiveIgnores >= 3
        
        await createGoalReflectionModal(
          currentPredictionData,
          handleContinueLearning,
          handleWatch5Minutes,
          handleWatchAnyway,
          isPausePrompt
        )
      } else if (decision === 'ALIGNED') {
        const durationMinutes = Math.round((videoInfo.duration || 0) / 60)
        await recordLearningVideoWatched(durationMinutes)
        createFloatingBadge('✅ Great choice! This supports your goal', '#10b981', 2000)
      }
    } else {
      console.error('❌ Prediction failed:', response.error)
      createFloatingBadge('✅ FocusAI is watching with you!', '#10b981', 2000)
    }
  } catch (e) {
    console.error('❌ Error calling prediction:', e)
    createFloatingBadge('✅ FocusAI is watching with you!', '#10b981', 2000)
  }
  
}

const getVideoInfoWithRetries = async (maxRetries = 10, delayMs = 500): Promise<any> => {
  let retries = 0
  while (retries < maxRetries) {
    console.log(`🎯 getVideoInfoWithRetries(): attempt ${retries+1}/${maxRetries}`)
    const videoInfo = getVideoInfo()
    if (videoInfo && videoInfo.title !== 'Unknown Title') {
      console.log(`🎯 getVideoInfoWithRetries(): SUCCESS on attempt ${retries+1}!`, videoInfo)
      return videoInfo
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
    retries++
  }
  console.log(`🎯 getVideoInfoWithRetries(): FAILED after ${maxRetries} attempts`)
  return null
}

const checkForNewVideo = async () => {
  const newVideoId = getVideoIdFromUrl()
  console.log('🎯 checkForNewVideo(): newVideoId:', newVideoId, 'currentVideoId:', currentVideoId)
  
  if (newVideoId && newVideoId !== currentVideoId) {
    if (currentVideoId && videoElement && watchStartTime) {
      sendWatchEnd(videoElement, { videoId: currentVideoId, duration: videoElement.duration })
    }
    
    currentVideoId = newVideoId
    isTracking = false
    watchStartTime = null
    videoElement = null
    currentPredictionData = null
    currentVideoInfo = null
    removeFloatingTimer()
    
    const existingPopup = document.getElementById('focusai-prediction-popup')
    const existingBackdrop = document.getElementById('focusai-backdrop')
    if (existingPopup) existingPopup.remove()
    if (existingBackdrop) existingBackdrop.remove()
    
    const videoInfo = await getVideoInfoWithRetries()
    if (videoInfo) {
      startTracking(videoInfo)
    }
  }
}

window.addEventListener('beforeunload', () => {
  if (currentVideoId && videoElement && watchStartTime) {
    sendWatchEnd(videoElement, { videoId: currentVideoId, duration: videoElement.duration })
  }
})

console.log('🎯 FocusAI content script initializing')
checkForNewVideo()

let lastUrl = location.href
window.addEventListener('popstate', () => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    console.log('URL changed:', location.href)
    checkForNewVideo()
  }
})

const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    console.log('URL changed via mutation:', location.href)
    checkForNewVideo()
  }
})
observer.observe(document.body, { subtree: true, childList: true })

console.log('🎯 FocusAI is ready and listening!')
