import { useState, useEffect } from 'react'
import { StorageService } from '@/lib/storage'
import { AuthService } from '@/lib/auth'
import type { User } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface DashboardSummary {
  focusScore: number
  activeGoal: { title: string; description: string } | null
  todayLearningVideos: number
  todaySkippedVideos: number
  weekLearningVideos: number
  weekSkippedVideos: number
  streak: number
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const fetchDashboardSummary = async () => {
    try {
      setSummaryLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/metrics`, { credentials: 'include' })
      const result = await response.json()
      if (response.ok && result.success) {
        setSummary(result.data)
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err)
    } finally {
      setSummaryLoading(false)
    }
  }

  const fetchUserFromWebApp = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/extension/user`, {
        credentials: 'include', // Important for including cookies!
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          await StorageService.setUser(result.data)
          setUser(result.data)
          setError(null)
          return
        }
      }

      // If not authenticated, clear stored user
      await StorageService.removeUser()
      setUser(null)
    } catch (err) {
      console.error('Error fetching user from web app:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      
      // First try loading from storage
      const storedUser = await StorageService.getUser()
      
      if (storedUser) {
        setUser(storedUser)
        setLoading(false)
        // Then try to refresh from web app in background
        fetchUserFromWebApp()
      } else {
        // Try to fetch from web app
        await fetchUserFromWebApp()
        setLoading(false)
      }
      await fetchDashboardSummary()
    }
    loadData()
  }, [])

  const handleSignIn = () => {
    // Just open the web app's sign in page instead of using chrome.identity for now
    chrome.tabs.create({ url: `${API_BASE_URL}/sign-in` })
  }

  const handleLogout = async () => {
    await AuthService.logout()
    setUser(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">FocusAI</h1>
          <p className="text-gray-600 mb-6">Sign in to start tracking your focus</p>
          <button
            onClick={handleSignIn}
            className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
        {error && (
          <div className="mt-4 text-red-600 text-sm">{error}</div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-5">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <img
            src={user.imageUrl || 'https://via.placeholder.com/48'}
            alt={user.firstName || 'User'}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      {summaryLoading ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-sm">Loading your data...</div>
        </div>
      ) : (
        <>
          {/* Streak Card */}
          {summary && summary.streak > 0 && (
            <div className="bg-gray-900 text-white rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <div>
                  <div className="text-lg font-bold">{summary.streak} day streak</div>
                  <div className="text-xs opacity-75">Keep it going!</div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{summary?.focusScore ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">Focus Score</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{summary?.todayLearningVideos ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">Learning Today</div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">This Week</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xl font-bold text-gray-900">{summary?.weekLearningVideos ?? 0}</div>
                <div className="text-xs text-gray-500 mt-1">Learning</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{summary?.weekSkippedVideos ?? 0}</div>
                <div className="text-xs text-gray-500 mt-1">Avoided</div>
              </div>
            </div>
          </div>

          {/* Current Goal */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">Current Goal</h3>
            <p className="text-sm text-gray-600">{summary?.activeGoal?.title || 'No goal set yet'}</p>
            {summary?.activeGoal?.description && (
              <p className="text-xs text-gray-400 mt-1">{summary.activeGoal.description}</p>
            )}
          </div>

          {/* Micro-nudge based on state */}
          {summary?.todayLearningVideos === 0 && (
            <div className="bg-gray-100 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                💡 You haven't logged learning time today. Pick up where you left off!
              </p>
            </div>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => chrome.tabs.create({ url: `${API_BASE_URL}/dashboard` })}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors text-sm"
        >
          Dashboard
        </button>
        <button
          onClick={() => chrome.tabs.create({ url: `${API_BASE_URL}/dashboard/reviews` })}
          className="w-full border-2 border-gray-900 text-gray-900 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Review Videos
        </button>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full text-gray-600 font-medium py-3 px-4 rounded-lg hover:text-gray-900 transition-colors text-sm"
        >
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="w-full text-gray-400 font-medium py-3 px-4 rounded-lg hover:text-gray-600 transition-colors text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default App
