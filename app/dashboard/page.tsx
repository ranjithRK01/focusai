'use client'

import { useState, useEffect } from 'react'

interface Metrics {
  totalWatchTime: number
  todayWatchTime: number
  weekWatchTime: number
  totalVideos: number
  todayVideos: number
  todayLearningVideos: number
  todaySkippedVideos: number
  todayStillProceededVideos: number
  weekLearningVideos: number
  weekSkippedVideos: number
  weekStillProceededVideos: number
  streak: number
  focusScore: number
  activeGoal: {
    _id: string
    title: string
    description: string
  } | null
  aiAnalytics: any
  topChannels: any[]
  recentVideos: any[]
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setMetrics(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Calculate derived metrics
  const distractionsAvoided = metrics?.todaySkippedVideos || 0
  const productiveVideos = metrics?.todayLearningVideos || 0
  const stillProceededVideos = metrics?.todayStillProceededVideos || 0
  const timeSaved = distractionsAvoided * 10 // 10 mins per skipped distraction

  // Weekly metrics
  const weekDistractionsAvoided = metrics?.weekSkippedVideos || 0
  const weekProductiveVideos = metrics?.weekLearningVideos || 0
  const weekTimeSaved = weekDistractionsAvoided * 10 // 10 mins per skipped distraction

  return (
    <div className="w-full h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-6xl">
        {/* 1. Greeting */}
        <div className="mb-4">
          <p className="text-xl font-medium text-gray-800 mb-1">
            Hi there 👋
          </p>
          <p className="text-gray-500 text-sm">
            Keep building toward {metrics?.activeGoal?.title ? `becoming ${metrics?.activeGoal?.title}` : 'your goals.'}
          </p>
        </div>

        {/* 2. Goal & Today's Win Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Current Goal Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100" style={{ maxHeight: '120px' }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎯</span>
              <p className="font-semibold text-gray-500 text-sm uppercase tracking-wider">Goal</p>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">
              {metrics?.activeGoal?.title || "No goal set yet"}
            </p>
            <p className="text-gray-600 text-sm">
              Today: {metrics?.activeGoal?.description || "Continue watching learning content."}
            </p>
          </div>

          {/* Today's Win Card (Hero) */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl p-5 shadow-xl" style={{ maxHeight: '260px' }}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🏆</span>
              <p className="text-lg font-bold">TODAY</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold">{timeSaved} mins saved</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{productiveVideos} productive videos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{distractionsAvoided} distractions avoided</p>
              </div>
              <div>
                <p className="text-2xl font-bold">🔥 {metrics?.streak || 0} day streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* This Week Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <p className="font-semibold text-gray-500 text-sm uppercase tracking-wider">This Week</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Mon-Sun</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-lg">⏱️</span>
                <p className="text-3xl font-bold text-emerald-600">{weekTimeSaved}</p>
              </div>
              <p className="text-xs text-gray-500">mins saved</p>
            </div>
            <div className="text-center border-l border-r border-gray-100">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-lg">✅</span>
                <p className="text-3xl font-bold text-blue-600">{weekProductiveVideos}</p>
              </div>
              <p className="text-xs text-gray-500">productive</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-lg">🚫</span>
                <p className="text-3xl font-bold text-red-500">{weekDistractionsAvoided}</p>
              </div>
              <p className="text-xs text-gray-500">avoided</p>
            </div>
          </div>
        </div>

        {/* 3. Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" style={{ maxHeight: '90px' }}>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">📺 Learning Videos</p>
            <p className="text-2xl font-bold text-gray-900">{productiveVideos}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" style={{ maxHeight: '90px' }}>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">🚫 Skipped</p>
            <p className="text-2xl font-bold text-gray-900">{distractionsAvoided}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" style={{ maxHeight: '90px' }}>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">▶ Still Proceeded</p>
            <p className="text-2xl font-bold text-gray-900">{stillProceededVideos}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" style={{ maxHeight: '90px' }}>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">⭐ Focus Score</p>
            <p className="text-2xl font-bold text-gray-900">{metrics?.focusScore || 0}</p>
          </div>
        </div>

        {/* 4. Quick Actions Row */}
        <div className="flex flex-wrap gap-4">
          <a href="/dashboard/history" className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-200" style={{ height: '50px' }}>
            Continue Learning
          </a>
          <a href="/dashboard/reviews" className="inline-flex items-center justify-center bg-white border-2 border-gray-200 hover:border-blue-600 text-gray-900 font-semibold py-3 px-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-200" style={{ height: '50px' }}>
            Review Videos
          </a>
          <a href="/dashboard/goals" className="inline-flex items-center justify-center bg-white border-2 border-gray-200 hover:border-blue-600 text-gray-900 font-semibold py-3 px-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-200" style={{ height: '50px' }}>
            Change Goal
          </a>
        </div>
      </div>
    </div>
  )
}
