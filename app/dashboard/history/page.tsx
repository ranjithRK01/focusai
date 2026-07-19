'use client'
import { useState, useEffect } from 'react'

type Filter = 'all' | 'learning' | 'distractions'

interface HistoryItem {
  _id: string
  title: string
  channel: string
  url: string
  watchedAt: string
  createdAt?: string
  predictionId?: any
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchHistory = async (newOffset = 0, append = false) => {
    try {
      const res = await fetch(`/api/watch?limit=50&offset=${newOffset}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          // Aggressively filter out any entries with "Unknown" title or channel
          const filteredData = data.data.history.filter((item: any) => 
            item.title !== 'Unknown' && 
            item.channel !== 'Unknown' &&
            item.title &&
            item.channel
          )
          
          if (append) {
            setHistory(prev => [...prev, ...filteredData])
          } else {
            setHistory(filteredData)
          }
          setHasMore(filteredData.length === 50)
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const loadMore = () => {
    const newOffset = offset + 50
    setOffset(newOffset)
    fetchHistory(newOffset, true)
  }

  const filteredHistory = history.filter(item => {
    // Hide entries with Unknown title or channel
    if (item.title === 'Unknown' || item.channel === 'Unknown' || !item.title || !item.channel) return false
    
    const prediction = item.predictionId
    const isAligned = prediction?.prediction === 'ALIGNED' || prediction?.category === 'productive'
    const isDistracting = prediction?.prediction === 'DISTRACTING' || prediction?.category === 'distraction'

    if (filter === 'learning') return isAligned
    if (filter === 'distractions') return isDistracting
    return true
  })

  const alignedVideos = filteredHistory.filter(item => 
    item.predictionId?.prediction === 'ALIGNED' || item.predictionId?.category === 'productive'
  )
  const distractingVideos = filteredHistory.filter(item => 
    item.predictionId?.prediction === 'DISTRACTING' || item.predictionId?.category === 'distraction'
  )
  const unknownVideos = filteredHistory.filter(item => 
    !item.predictionId || 
    (item.predictionId.prediction === 'UNKNOWN' && item.predictionId.category !== 'productive' && item.predictionId.category !== 'distraction')
  )

  const todayStr = new Date().toDateString()
  const todayAligned = alignedVideos.filter(i => new Date(i.watchedAt).toDateString() === todayStr).length
  const todayDistracting = distractingVideos.filter(i => new Date(i.watchedAt).toDateString() === todayStr).length
  const todaySaved = todayDistracting * 10 // assume 10 mins saved per distraction

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getCategory = (prediction: any) => {
    if (!prediction || !prediction.topics?.length) return 'Unknown'
    return prediction.topics[0]
  }

  const VideoCard = ({ item, type }: { item: HistoryItem; type: 'aligned' | 'distracting' | 'unknown' }) => {
    const bg = type === 'aligned' ? 'bg-green-50 border-green-200' : type === 'distracting' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
    const badgeBg = type === 'aligned' ? 'bg-green-100 text-green-800' : type === 'distracting' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
    const badgeText = type === 'aligned' ? '✓ Aligned' : type === 'distracting' ? 'Not Related' : 'Unknown'

    // Fallback to prediction data if watch history data is missing
    const displayChannel = item.channel || item.predictionId?.videoChannel || 'Unknown'
    const displayWatchedAt = item.watchedAt || item.createdAt || new Date().toISOString()
    const isValidDate = !isNaN(new Date(displayWatchedAt).getTime())

    return (
      <div className={`${bg} border rounded-xl p-4 mb-3`} style={{ minHeight: '90px' }}>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-semibold text-gray-900 hover:underline block mb-1"
        >
          {item.title}
        </a>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-gray-600">{displayChannel}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {isValidDate ? `Watched ${formatTime(displayWatchedAt)}` : 'Watched Invalid Date'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{getCategory(item.predictionId)}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeBg}`}>
              {badgeText}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Watch History</h1>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-700">✅ {todayAligned}</p>
          <p className="text-gray-500 text-sm">Learning Videos</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-700">🚫 {todayDistracting}</p>
          <p className="text-gray-500 text-sm">Distractions</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-700">⏱ {todaySaved} mins</p>
          <p className="text-gray-500 text-sm">Saved</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${filter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('learning')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${filter === 'learning' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Learning
        </button>
        <button
          onClick={() => setFilter('distractions')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${filter === 'distractions' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Distractions
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Aligned Column */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <span className="text-2xl">✅</span>
            <h2 className="text-xl font-bold text-gray-900">Learning Videos</h2>
            <span className="text-sm text-gray-500">({alignedVideos.length + (filter === 'all' ? unknownVideos.length : 0)} Videos)</span>
          </div>
          {alignedVideos.length === 0 && unknownVideos.length === 0 && filter !== 'distractions' ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No learning videos yet!</p>
              <p className="text-gray-400 text-sm mt-1">Start watching content related to your goal.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {[...(filter !== 'distractions' ? unknownVideos : []), ...alignedVideos].map(item => {
                const isAligned = item.predictionId?.prediction === 'ALIGNED' || item.predictionId?.category === 'productive'
                return (
                  <VideoCard
                    key={item._id}
                    item={item}
                    type={isAligned ? 'aligned' : 'unknown'}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Distracting Column */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <span className="text-2xl">🚫</span>
            <h2 className="text-xl font-bold text-gray-900">Distractions</h2>
            <span className="text-sm text-gray-500">({distractingVideos.length} Videos)</span>
          </div>
          {distractingVideos.length === 0 && filter !== 'learning' ? (
            <div className="text-center py-10 bg-green-50 rounded-xl border border-green-100">
              <span className="text-4xl">🎉</span>
              <p className="text-green-700 font-medium mt-3">No distractions today.</p>
              <p className="text-green-600 text-sm mt-1">Great job staying focused!</p>
            </div>
          ) : (
            <div className="space-y-0">
              {distractingVideos.map(item => (
                <VideoCard
                  key={item._id}
                  item={item}
                  type="distracting"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-12">
          <button
            onClick={loadMore}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
