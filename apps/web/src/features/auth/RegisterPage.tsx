import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Brain, Eye, EyeOff } from 'lucide-react'

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type RegisterForm = z.infer<typeof RegisterSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
  })

  async function onSubmit(values: RegisterForm) {
    setServerError(null)
    setSuccessMessage(null)
    const timezone = 'Asia/Manila'
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { name: values.name, timezone },
      },
    })
    if (error) {
      setServerError(error.message)
    } else if (data.user && !data.session) {
      setSuccessMessage('Account created! Please check your email to verify your address, then sign in.')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Brain size={36} />
          <h1>MindTrack</h1>
          <p>Start tracking your academics</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">Full name</label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              className={`form-input ${errors.name ? 'form-input--error' : ''}`}
              placeholder="Alex Smith"
              {...register('name')}
            />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              className={`form-input ${errors.email ? 'form-input--error' : ''}`}
              placeholder="you@university.edu"
              {...register('email')}
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <div className="input-with-icon">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                placeholder="At least 8 characters"
                {...register('password')}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">Confirm password</label>
            <input
              id="reg-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
              placeholder="••••••••"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
          </div>

          {serverError && (
            <div className="form-server-error" role="alert">{serverError}</div>
          )}

          {successMessage && (
            <div className="form-success-message" role="status" style={{ padding: '0.75rem 1rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '8px', color: '#86efac', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
              {successMessage}
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            className="btn btn--primary btn--full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
