import { useEffect, useState } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { auth, db, googleProvider, microsoftProvider, ADMIN_EMAIL } from '../lib/firebase'
import type { User } from 'firebase/auth'

interface Testimonial {
  id: string
  text: string
  authorName: string
  authorEmail: string
  authorPhoto: string | null
  context: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: { seconds: number } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  approved: 'text-green-400 bg-green-400/10 border-green-400/30',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setTestimonials(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial))
      )
    })
    return unsub
  }, [user])

  const [loginError, setLoginError] = useState('')

  const handleLogin = async (provider: 'google' | 'microsoft') => {
    setLoginError('')
    try {
      await signInWithPopup(auth, provider === 'google' ? googleProvider : microsoftProvider)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoginError(`Erro: ${msg}`)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const setStatus = async (id: string, status: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'testimonials', id), { status })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este depoimento permanentemente?')) return
    await deleteDoc(doc(db, 'testimonials', id))
  }

  const filtered = filter === 'all'
    ? testimonials
    : testimonials.filter(t => t.status === filter)

  const counts = {
    pending: testimonials.filter(t => t.status === 'pending').length,
    approved: testimonials.filter(t => t.status === 'approved').length,
    rejected: testimonials.filter(t => t.status === 'rejected').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="glass border border-white/10 rounded-sm p-10 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full border-2 border-gold flex items-center justify-center bg-gold/10 mx-auto mb-6">
            <span className="font-serif font-bold text-gold text-lg">HF</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-white mb-2">
            Painel Admin
          </h1>
          <p className="text-white/50 text-sm font-light mb-8">
            Entre com a conta autorizada para gerenciar os depoimentos.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleLogin('google')}
              className="flex items-center gap-3 mx-auto px-6 py-3 bg-white text-gray-800 font-medium text-sm rounded-sm hover:bg-gray-100 transition-colors"
            >
              <GoogleIcon />
              Entrar com Google
            </button>
            <button
              onClick={() => handleLogin('microsoft')}
              className="flex items-center gap-3 mx-auto px-6 py-3 bg-[#2F2F2F] text-white font-medium text-sm rounded-sm hover:bg-[#1a1a1a] transition-colors border border-white/10"
            >
              <MicrosoftIcon />
              Entrar com Microsoft
            </button>
          </div>
          {loginError && (
            <p className="text-red-400 text-xs mt-4 max-w-xs mx-auto break-words">{loginError}</p>
          )}
        </div>
      </div>
    )
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="glass border border-red-500/20 rounded-sm p-10 w-full max-w-sm text-center">
          <p className="text-red-400 font-serif text-lg font-semibold mb-2">
            Acesso negado
          </p>
          <p className="text-white/50 text-sm font-light mb-6">
            Esta conta não tem permissão para acessar o painel.
          </p>
          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-white text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="border-b border-gold/10 bg-dark-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-gold flex items-center justify-center bg-gold/10">
              <span className="font-serif font-bold text-gold text-sm">HF</span>
            </div>
            <div>
              <p className="font-serif font-semibold text-white text-sm">Painel Admin</p>
              <p className="text-gold text-[10px] tracking-widest uppercase font-light">Depoimentos</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user.photoURL && (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full opacity-70" />
            )}
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-white text-sm transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <div key={s} className="glass border border-white/8 rounded-sm p-5 text-center">
              <p className={`text-3xl font-serif font-bold ${s === 'pending' ? 'text-yellow-400' : s === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                {counts[s]}
              </p>
              <p className="text-white/40 text-xs uppercase tracking-wide mt-1">
                {STATUS_LABEL[s]}
              </p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-medium tracking-wide uppercase rounded-sm border transition-all duration-200 ${
                filter === f
                  ? 'bg-gold text-dark border-gold'
                  : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
              {f !== 'all' && ` (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* Testimonials list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30 text-sm">
            Nenhum depoimento {filter !== 'all' ? STATUS_LABEL[filter].toLowerCase() : ''}.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(t => (
              <div
                key={t.id}
                className="glass border border-white/8 rounded-sm p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {t.authorPhoto ? (
                      <img src={t.authorPhoto} alt="" className="w-9 h-9 rounded-full" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                        <span className="text-gold text-sm font-serif font-bold">
                          {t.authorName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium text-sm">{t.authorName}</p>
                      <p className="text-white/40 text-xs">{t.authorEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-sm border ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    <span className="text-white/20 text-xs px-2.5 py-1 border border-white/8 rounded-sm">
                      {t.context}
                    </span>
                  </div>
                </div>

                <p className="text-white/70 text-sm font-light leading-relaxed mb-5">
                  "{t.text}"
                </p>

                {t.createdAt && (
                  <p className="text-white/25 text-xs mb-4">
                    {new Date(t.createdAt.seconds * 1000).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}

                {t.status !== 'approved' && (
                  <button
                    onClick={() => setStatus(t.id, 'approved')}
                    className="mr-3 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium rounded-sm hover:bg-green-500/20 transition-colors"
                  >
                    Aprovar
                  </button>
                )}
                {t.status !== 'rejected' && (
                  <button
                    onClick={() => setStatus(t.id, 'rejected')}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium rounded-sm hover:bg-red-500/20 transition-colors"
                  >
                    Rejeitar
                  </button>
                )}
                {t.status === 'rejected' && (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white/40 text-xs font-medium rounded-sm hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
                  >
                    Excluir
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
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
