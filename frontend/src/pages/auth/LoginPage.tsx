// frontend/src/pages/auth/LoginPage.tsx

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GoogleLogin } from '@react-oauth/google'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Check if Google OAuth is configured
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const isGoogleOAuthEnabled = Boolean(googleClientId && googleClientId.trim() !== '')

  const from = location.state?.from?.pathname || '/dashboard'

  // Redirect when authenticated - use a ref to prevent multiple redirects
  const hasRedirected = useRef(false)
  
  useEffect(() => {
    if (isAuthenticated && !isLoading && !hasRedirected.current) {
      console.log('[LoginPage] User authenticated, navigating to:', from)
      hasRedirected.current = true
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, from])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      console.log('[LoginPage] Submitting login for:', data.email)
      await login(data.email, data.password)
      console.log('[LoginPage] Login successful')
      toast.success('Welcome back!')
      // Don't navigate here - let useEffect handle it
      // This ensures the state update has propagated
    } catch (error: any) {
      console.error('[LoginPage] Login failed:', error)
      toast.error(error.response?.data?.message || 'Login failed')
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsGoogleLoading(true)
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google')
      }
      await loginWithGoogle(credentialResponse.credential)
      toast.success('Welcome back!')
      // Don't navigate here - let useEffect handle it
      // This ensures the state update has propagated
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Google login failed')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleGoogleError = () => {
    toast.error('Google login failed. Please try again.')
    setIsGoogleLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">FF</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to FeedbackFlow
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Login</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                {...register('email')}
                type="email"
                label="Email address"
                placeholder="Enter your email"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                autoComplete="email"
              />

              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                error={errors.password?.message}
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Sign in
              </Button>
            </form>

            {isGoogleOAuthEnabled && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="mt-4">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    width="100%"
                  />
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Demo credentials</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-600">
                  <strong>Admin:</strong> itays@wix.com
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Manager:</strong> efratr@wix.com
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Employee:</strong> tovahc@wix.com
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Use any password to login (mock authentication)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
