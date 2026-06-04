import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4 text-gray-300 font-bold">404</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Page not found</h1>
        <p className="text-sm text-gray-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors no-underline"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
