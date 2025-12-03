// frontend/src/pages/auth/GoogleOAuthTestPage.tsx

import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

export default function GoogleOAuthTestPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<any>(null)

  // Get environment variables
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const isGoogleOAuthEnabled = Boolean(googleClientId && googleClientId.trim() !== '')

  // Get all VITE env vars for debugging
  const viteEnvVars = Object.keys(import.meta.env)
    .filter(key => key.startsWith('VITE_'))
    .reduce((acc, key) => {
      acc[key] = import.meta.env[key]
      return acc
    }, {} as Record<string, any>)

  const handleGoogleSuccess = (credentialResponse: any) => {
    console.log('✅ Google Login Success:', credentialResponse)
    setSuccess(credentialResponse)
    setError(null)
    setDebugInfo({
      timestamp: new Date().toISOString(),
      hasCredential: !!credentialResponse.credential,
      credentialLength: credentialResponse.credential?.length || 0,
      select_by: credentialResponse.select_by,
      fullResponse: credentialResponse,
    })
  }

  const handleGoogleError = () => {
    const errorMsg = 'Google Login Failed';
    console.error('❌ Google Login Error:', errorMsg)
    setError(errorMsg)
    setSuccess(null)
    setDebugInfo({
      timestamp: new Date().toISOString(),
      error: errorMsg,
      fullError: errorMsg,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Google OAuth Test Page
          </h1>

          {/* Environment Variables Debug */}
          <div className="mb-6 p-4 bg-gray-50 rounded border">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Environment Variables
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">VITE_GOOGLE_CLIENT_ID:</span>{' '}
                <span className={googleClientId ? 'text-green-600' : 'text-red-600'}>
                  {googleClientId || '(not set)'}
                </span>
              </div>
              <div>
                <span className="font-medium">OAuth Enabled:</span>{' '}
                <span className={isGoogleOAuthEnabled ? 'text-green-600' : 'text-red-600'}>
                  {isGoogleOAuthEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  All VITE Environment Variables
                </summary>
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                  {JSON.stringify(viteEnvVars, null, 2)}
                </pre>
              </details>
            </div>
          </div>

          {/* Google Login Button */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Google Login Button
            </h2>
            {isGoogleOAuthEnabled ? (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                Google OAuth is not enabled. Please set VITE_GOOGLE_CLIENT_ID in your .env file.
              </div>
            )}
          </div>

          {/* Success Response */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                ✅ Success Response
              </h2>
              <pre className="text-xs overflow-auto bg-white p-3 rounded">
                {JSON.stringify(success, null, 2)}
              </pre>
              {debugInfo && (
                <div className="mt-3">
                  <h3 className="font-semibold text-green-700 mb-1">Debug Info:</h3>
                  <pre className="text-xs overflow-auto bg-white p-3 rounded">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Error Response */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                ❌ Error Response
              </h2>
              <pre className="text-xs overflow-auto bg-white p-3 rounded text-red-600">
                {error}
              </pre>
              {debugInfo && (
                <div className="mt-3">
                  <h3 className="font-semibold text-red-700 mb-1">Debug Info:</h3>
                  <pre className="text-xs overflow-auto bg-white p-3 rounded">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">Debug Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>Open browser DevTools (F12)</li>
              <li>Go to Console tab to see detailed logs</li>
              <li>Go to Network tab to see request details</li>
              <li>Click the Google Login button above</li>
              <li>Check the console and network requests for errors</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

