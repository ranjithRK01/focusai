import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="text-xl font-bold text-gray-900">FocusAI</div>
        <div className="flex gap-4">
          <Link 
            href="/sign-in" 
            className="px-5 py-2.5 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/sign-up" 
            className="px-5 py-2.5 rounded-lg font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            You opened YouTube to learn. Then 40 minutes disappeared.
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
            FocusAI checks every YouTube video against your goal — before autoplay and recommendations pull you away.
          </p>
          <div className="flex gap-4 justify-center mb-16">
            <Link 
              href="/sign-up" 
              className="px-8 py-3.5 rounded-lg font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
            <Link 
              href="/sign-in" 
              className="px-8 py-3.5 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:border-gray-400 transition-colors"
            >
              Sign In
            </Link>
          </div>
          
          {/* Intervention Popup Mockup */}
          <div className="max-w-3xl mx-auto mb-8">
            {/* Browser Window Frame */}
            <div className="bg-gray-100 rounded-xl shadow-2xl overflow-hidden">
              {/* Browser Top Bar */}
              <div className="bg-gray-200 px-4 py-3 flex items-center gap-3">
                {/* Window Controls */}
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400 opacity-60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-60" />
                  <div className="w-3 h-3 rounded-full bg-green-400 opacity-60" />
                </div>
                {/* Address Bar */}
                <div className="flex-1 bg-white rounded-md px-4 py-1.5 text-sm font-mono text-gray-500">
                  youtube.com/watch?v=dQw4w9WgXcQ
                </div>
              </div>
              
              {/* YouTube Video Player Area */}
              <div className="bg-gray-900 relative h-80 flex items-center justify-center overflow-hidden">
                {/* Abstract Video Frame Background */}
                <div className="absolute inset-0 opacity-15">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg blur-xl" />
                  <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-tl from-gray-700 to-gray-900 rounded-full blur-2xl" />
                  <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-to-r from-gray-500 to-gray-700 rounded-lg blur-lg" />
                </div>
                
                {/* Large YouTube Play Button */}
                <svg className="w-24 h-24 text-white opacity-25 absolute" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                
                {/* YouTube Progress Bar */}
                <div className="absolute bottom-12 left-0 right-0 h-1 bg-gray-800">
                  <div className="h-full w-1/3 bg-red-600 opacity-80 relative">
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
                  </div>
                </div>
                
                {/* YouTube Player Control Bar */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <svg className="w-5 h-5 text-white opacity-40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <svg className="w-5 h-5 text-white opacity-40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-4">
                    <svg className="w-5 h-5 text-white opacity-40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                    </svg>
                    <svg className="w-5 h-5 text-white opacity-40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  </div>
                </div>
                
                {/* Intervention Popup Card */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-8 shadow-2xl max-w-[500px] w-full z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <svg className="w-8 h-8 text-gray-900 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-gray-900 mb-3 text-xl">
                        This doesn't contribute to your goal
                      </h3>
                      <p className="text-base text-gray-600 leading-relaxed">
                        Watching it will cost approximately 15 minutes of focused learning time
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                    <button className="flex-1 bg-gray-900 text-white px-5 py-3 rounded-lg text-base font-bold hover:bg-gray-800 transition-colors">
                      Continue Learning
                    </button>
                    <button className="flex-1 bg-white border-2 border-gray-900 text-gray-900 px-5 py-3 rounded-lg text-base font-medium hover:bg-gray-50 transition-colors">
                      Watch for 5 Minutes
                    </button>
                    <button className="flex-1 text-gray-500 px-5 py-3 rounded-lg text-base font-medium hover:text-gray-700 transition-colors">
                      Continue to Video
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stat Line */}
          <p className="text-sm text-gray-400">
            Average user saves 70+ minutes a day
          </p>
        </div>
      </main>
    </div>
  );
}