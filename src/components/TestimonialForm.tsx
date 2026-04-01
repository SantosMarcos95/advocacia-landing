import { useState } from 'react'
import { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { X } from 'lucide-react'
import { auth, db, googleProvider } from '../lib/firebase'
import type { User } from 'firebase/auth'

const AREAS = [
  'Direito Trabalhista',
  'Direito do Consumidor',
  'Direito Cível',
  'Direito Empresarial',
  'Consultoria Jurídica',
]

interface Props {
  onClose: () => void
}

export default function TestimonialForm({ onClose }: Props) {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName ?? '')
  const [context, setContext] = useState(AREAS[0])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [emailMode, setEmailMode] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      setUser(result.user)
      setDisplayName(result.user.displayName ?? '')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Erro: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let result
      try {
        result = await signInWithEmailAndPassword(auth, emailInput, passwordInput)
      } catch {
        result = await createUserWithEmailAndPassword(auth, emailInput, passwordInput)
      }
      setUser(result.user)
      setDisplayName(result.user.displayName ?? '')
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
        setError('Senha incorreta. Tente novamente.')
      } else if (firebaseError.code === 'auth/weak-password') {
        setError('Senha muito curta. Use ao menos 6 caracteres.')
      } else if (firebaseError.code === 'auth/invalid-email') {
        setError('E-mail inválido.')
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        setError(`Erro: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    setUser(null)
    setDisplayName('')
    setText('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !text.trim() || !displayName.trim()) return
    setLoading(true)
    setError('')
    try {
      await addDoc(collection(db, 'testimonials'), {
        text: text.trim(),
        authorName: displayName.trim(),
        authorEmail: user.email,
        authorPhoto: user.photoURL,
        context,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setDone(true)
    } catch {
      setError('Erro ao enviar depoimento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass border border-white/10 rounded-sm p-8 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-6 bg-gold" />
            <span className="text-gold text-xs tracking-[0.3em] uppercase font-medium">
              Depoimento
            </span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-white">
            Compartilhe sua experiência
          </h3>
          <p className="text-white/50 text-sm font-light mt-1">
            Seu depoimento será revisado antes de ser publicado.
          </p>
        </div>

        {/* Done state */}
        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-white font-serif text-lg font-semibold mb-2">
              Obrigado pelo depoimento!
            </p>
            <p className="text-white/50 text-sm font-light">
              Ele será revisado e publicado em breve.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 border border-gold text-gold text-sm font-medium tracking-wide hover:bg-gold hover:text-dark transition-all duration-300 rounded-sm"
            >
              Fechar
            </button>
          </div>
        ) : !user ? (
          /* Login state */
          <div className="py-4">
            <p className="text-white/60 text-sm font-light mb-6 text-center">
              Entre com sua conta para deixar um depoimento.
            </p>

            {!emailMode ? (
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex items-center gap-3 px-6 py-3 bg-white text-gray-800 font-medium text-sm rounded-sm hover:bg-gray-100 transition-colors disabled:opacity-50 w-full justify-center"
                >
                  <GoogleIcon />
                  {loading ? 'Entrando...' : 'Entrar com Google'}
                </button>

                <div className="flex items-center gap-3 w-full my-1">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/30 text-xs">ou</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button
                  onClick={() => setEmailMode(true)}
                  disabled={loading}
                  className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 text-white font-medium text-sm rounded-sm hover:bg-white/10 transition-colors disabled:opacity-50 w-full justify-center"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  Entrar com e-mail
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="Seu e-mail"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm font-light placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
                />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Senha (mín. 6 caracteres)"
                  required
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm font-light placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
                />
                <p className="text-white/30 text-xs text-center -mt-1">
                  Se for a primeira vez, uma conta será criada automaticamente.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gold text-dark font-semibold text-sm rounded-sm hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Continuar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEmailMode(false); setError('') }}
                  className="text-white/30 hover:text-white/60 text-xs text-center transition-colors"
                >
                  Voltar
                </button>
              </form>
            )}

            {error && (
              <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
            )}
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Logged in as */}
            <div className="flex items-center justify-between p-3 rounded-sm bg-white/5 border border-white/8">
              <div className="flex items-center gap-3">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? ''}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-white/70 text-sm">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-white/30 hover:text-white/60 text-xs transition-colors"
              >
                Sair
              </button>
            </div>

            {/* Display name */}
            <div>
              <label className="text-white/60 text-xs tracking-wide uppercase font-medium block mb-1.5">
                Nome para exibição
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Como quer ser identificado(a)"
                maxLength={60}
                required
                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm font-light placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            {/* Area */}
            <div>
              <label className="text-white/60 text-xs tracking-wide uppercase font-medium block mb-1.5">
                Área do atendimento
              </label>
              <select
                value={context}
                onChange={e => setContext(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm font-light focus:outline-none focus:border-gold/50 transition-colors appearance-none"
              >
                {AREAS.map(area => (
                  <option key={area} value={area} className="bg-dark-200 text-white">
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Text */}
            <div>
              <label className="text-white/60 text-xs tracking-wide uppercase font-medium block mb-1.5">
                Seu depoimento
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Conte como foi sua experiência..."
                maxLength={500}
                required
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm font-light placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors resize-none"
              />
              <p className="text-white/25 text-xs text-right mt-1">
                {text.length}/500
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !text.trim() || !displayName.trim()}
              className="w-full py-3.5 bg-gold text-dark font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-300 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar depoimento'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
