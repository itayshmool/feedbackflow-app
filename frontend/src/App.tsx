// frontend/src/App.tsx

import { useAuthStore } from './stores/authStore'
import { useEffect, useState } from 'react'
import LoadingSpinner from './components/ui/LoadingSpinner'
import AppRouter from './router'

function App() {
  const { isLoading, checkAuth } = useAuthStore()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    console.log('[App] Checking auth on mount')
    checkAuth().finally(() => {
      console.log('[App] Auth check complete')
      setHasChecked(true)
    })
  }, [checkAuth])

  if (!hasChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return <AppRouter />
}

export default App
