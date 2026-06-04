'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4 text-red-500 font-bold">!</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-2">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-6 font-mono">Error ID: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
