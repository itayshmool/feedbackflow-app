// frontend/src/App.tsx

import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'
import LoadingSpinner from './components/ui/LoadingSpinner'
import AppRouter from './router'

function App() {
  const { isLoading, checkAuth } = useAuthStore()

  // Initialize auth state on app load
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return <AppRouter />
}

export default App
