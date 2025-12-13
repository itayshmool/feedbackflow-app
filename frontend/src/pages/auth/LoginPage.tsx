// frontend/src/pages/auth/LoginPage.tsx

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GoogleLogin } from '@react-oauth/google'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, HelpCircle, MessageSquare, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

// FeedbackFlow Logo
const Logo = () => (
  <div className="flex items-center justify-center gap-3">
    <div className="h-14 w-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25 transform hover:scale-105 transition-transform duration-200">
      <span className="text-white font-bold text-2xl tracking-tight">FF</span>
    </div>
  </div>
)

// Decorative Conversation Bubble Shape (top-left)
const ConversationBubbleShape = () => (
  <div className="absolute -top-20 -left-20 w-[400px] h-[400px] opacity-[0.07] pointer-events-none hidden lg:block">
    <div className="relative w-full h-full">
      {/* Main bubble */}
      <div className="absolute inset-0 bg-primary-500 rounded-full blur-3xl" />
      {/* Smaller accent bubble */}
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-primary-400 rounded-full blur-2xl opacity-60" />
      {/* Chat icon hint */}
      <MessageSquare 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-primary-600 opacity-30" 
        strokeWidth={1}
      />
    </div>
  </div>
)

// Decorative Dashboard/Metrics Shape (bottom-right)
const DashboardMetricsShape = () => (
  <div className="absolute -bottom-16 -right-16 w-[350px] h-[300px] opacity-[0.05] pointer-events-none hidden lg:block">
    <div className="relative w-full h-full">
      {/* Stacked bars representing metrics */}
      <div className="absolute bottom-0 right-0 flex items-end gap-3">
        <div className="w-12 h-32 bg-primary-500 rounded-t-lg blur-sm" />
        <div className="w-12 h-48 bg-primary-600 rounded-t-lg blur-sm" />
        <div className="w-12 h-40 bg-primary-500 rounded-t-lg blur-sm" />
        <div className="w-12 h-56 bg-primary-600 rounded-t-lg blur-sm" />
        <div className="w-12 h-36 bg-primary-500 rounded-t-lg blur-sm" />
      </div>
      {/* Chart icon hint */}
      <BarChart3 
        className="absolute bottom-1/3 right-1/3 w-20 h-20 text-primary-600 opacity-40" 
        strokeWidth={1}
      />
    </div>
  </div>
)

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Check if Google OAuth is configured
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const isGoogleOAuthEnabled = Boolean(googleClientId && googleClientId.trim() !== '')
  
  // Check if mock login is enabled via environment variable
  const isMockLoginEnabled = import.meta.env.VITE_ENABLE_MOCK_LOGIN === 'true'

  const from = location.state?.from?.pathname || '/dashboard'

  // Redirect when authenticated
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
      await login(data.email, data.password)
      toast.success('Welcome back!')
    } catch (error: any) {
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
    <div className="min-h-screen flex login-page-bg">
      {/* ═══════════════════════════════════════════════════════════════
          LEFT SIDE - Branding & Abstract Background (Desktop only)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08), transparent 55%),
              radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.06), transparent 50%),
              #F5F7FB
            `
          }}
        />
        
        {/* Decorative shapes */}
        <ConversationBubbleShape />
        <DashboardMetricsShape />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          {/* Logo & Brand */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-16 w-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20">
                <span className="text-white font-bold text-3xl tracking-tight">FF</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 tracking-tight">FeedbackFlow</span>
            </div>
            
            {/* Tagline */}
            <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Empower your team
              <br />
              <span className="text-primary-600">with meaningful feedback</span>
            </h1>
            
            <p className="text-lg text-gray-600 max-w-md leading-relaxed">
              Streamline performance reviews, foster growth, and build stronger teams 
              with actionable insights.
            </p>
          </div>
          
          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: '📊', text: 'Real-time analytics & insights' },
              { icon: '🔄', text: 'Seamless feedback cycles' },
              { icon: '🎯', text: 'Goal tracking & alignment' },
            ].map((feature, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 text-gray-700 feature-highlight"
                style={{ animationDelay: `${0.3 + idx * 0.1}s` }}
              >
                <span className="text-xl">{feature.icon}</span>
                <span className="text-base font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT SIDE - Login Card
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col relative">
        {/* Mobile gradient background (visible only on mobile) */}
        <div 
          className="absolute inset-0 lg:hidden"
          style={{
            background: `
              radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.06), transparent 40%),
              #F8FAFC
            `
          }}
        />
        
        {/* Desktop: solid white background */}
        <div className="absolute inset-0 hidden lg:block bg-white" />
        
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-8 sm:py-12 relative z-10">
          <div className="w-full max-w-[420px] animate-fade-in-up">
            {/* Mobile Logo - only show on mobile */}
            <div className="lg:hidden text-center mb-8">
              <Logo />
              <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Sign in to FeedbackFlow
              </h1>
              <p className="mt-3 text-base sm:text-lg text-gray-600">
                {!isMockLoginEnabled 
                  ? 'Use your Wix Google account to access your workspace'
                  : 'Enter your credentials to access your account'
                }
              </p>
            </div>

            {/* Desktop Header - only show on desktop */}
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-base text-gray-600">
                {!isMockLoginEnabled 
                  ? 'Sign in with your Wix Google account'
                  : 'Enter your credentials to continue'
                }
              </p>
            </div>

            {/* Auth card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
              {/* Card header - only show for production (Google-only) mode */}
              {!isMockLoginEnabled && (
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary-600" />
                    <h2 className="text-base font-semibold text-gray-900">
                      Wix Organization Login
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Secure single sign-on for Wix employees
                  </p>
                </div>
              )}
              
              {/* Card content */}
              <div className="p-6">
                {/* Google-only login (Production) */}
                {!isMockLoginEnabled ? (
                  <div className="space-y-4">
                    {isGoogleOAuthEnabled ? (
                      <>
                        {/* Google Login button */}
                        <div className="google-login-wrapper flex justify-center">
                          <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            useOneTap={false}
                            theme="outline"
                            size="large"
                            text="continue_with"
                            shape="rectangular"
                            width="368"
                            logo_alignment="left"
                          />
                        </div>
                        
                        {/* Alternative: Use a different Google account */}
                        <div className="pt-2">
                          <button
                            type="button"
                            className="w-full text-sm text-gray-500 hover:text-primary-600 transition-colors py-2 tap-target"
                            onClick={() => {
                              // Trigger Google account picker by using prompt
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const googleApi = (window as any).google
                              if (googleApi?.accounts?.id?.prompt) {
                                googleApi.accounts.id.prompt()
                              }
                            }}
                          >
                            Use a different Google account
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-error-100 mb-4">
                          <HelpCircle className="w-7 h-7 text-error-600" />
                        </div>
                        <p className="text-base text-gray-700 font-medium">
                          Google OAuth is not configured
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Please contact your administrator to set up authentication.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Development: Full login options */
                  <>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      <Input
                        {...register('email')}
                        type="email"
                        label="Email address"
                        placeholder="you@wix.com"
                        leftIcon={<Mail className="h-4 w-4" />}
                        error={errors.email?.message}
                        autoComplete="email"
                        className="h-12"
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
                            className="text-gray-400 hover:text-gray-600 p-1 tap-target"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                        className="h-12"
                      />

                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-medium tap-target"
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
                            <div className="w-full border-t border-gray-200" />
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white text-gray-500">or</span>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-center">
                          <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            useOneTap={false}
                            theme="outline"
                            size="large"
                            text="continue_with"
                            shape="rectangular"
                            width="368"
                          />
                        </div>
                      </div>
                    )}

                    {/* Dev credentials */}
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Demo accounts (dev only)
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center text-gray-600">
                          <span className="font-medium">Admin:</span>
                          <code className="text-primary-600 bg-primary-50 px-2 py-1 rounded text-xs font-mono">itays@wix.com</code>
                        </div>
                        <div className="flex justify-between items-center text-gray-600">
                          <span className="font-medium">Manager:</span>
                          <code className="text-primary-600 bg-primary-50 px-2 py-1 rounded text-xs font-mono">efratr@wix.com</code>
                        </div>
                        <div className="flex justify-between items-center text-gray-600">
                          <span className="font-medium">Employee:</span>
                          <code className="text-primary-600 bg-primary-50 px-2 py-1 rounded text-xs font-mono">tovahc@wix.com</code>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-400">
                        Use any password to login
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer info */}
            <footer className="mt-8 text-center space-y-3">
              <p className="text-sm text-gray-500">
                For Wix employees only
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <a href="#" className="hover:text-gray-600 transition-colors">
                  Privacy Policy
                </a>
                <span>•</span>
                <a href="#" className="hover:text-gray-600 transition-colors">
                  Terms of Service
                </a>
                <span>•</span>
                <a href="mailto:support@wix.com" className="hover:text-gray-600 transition-colors">
                  Contact Admin
                </a>
              </div>
              <p className="text-xs text-gray-300">
                FeedbackFlow v1.0
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
