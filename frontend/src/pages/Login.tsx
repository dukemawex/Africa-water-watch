import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets, Eye, EyeOff } from 'lucide-react'
import api from '../api/client'
import { useWaterStore } from '../store/useWaterStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useWaterStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.append('username', email)
      params.append('password', password)

      const tokenRes = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      localStorage.setItem('access_token', tokenRes.data.access_token)

      const userRes = await api.get('/auth/me')
      setUser(userRes.data)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center mb-4">
            <Droplets className="w-8 h-8 text-teal-400" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">AquaWatch Africa</h1>
          <p className="text-sm text-muted mt-1">Water Quality Monitoring Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-navy-700 border border-navy-600 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-navy-700 border border-navy-600 text-white text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger-500 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          Monitoring boreholes, rivers, and community water points across Africa
        </p>
      </div>
    </div>
  )
}
