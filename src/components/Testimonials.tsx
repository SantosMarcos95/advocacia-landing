import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import TestimonialForm from './TestimonialForm'

interface Testimonial {
  id: string
  text: string
  authorName: string
  authorPhoto: string | null
  context: string
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'testimonials'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setTestimonials(snap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial)))
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <section
      id="depoimentos"
      className="relative bg-dark-100 py-24 overflow-hidden"
    >
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Decorative glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[500px] h-[300px] bg-gold/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="section-padding max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-gold" />
            <span className="text-gold text-xs font-medium tracking-[0.3em] uppercase">
              Depoimentos
            </span>
            <div className="h-px w-8 bg-gold" />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight">
            O que dizem os{' '}
            <span className="gold-text">clientes</span>
          </h2>
          <p className="text-white/50 mt-4 max-w-xl mx-auto font-light leading-relaxed">
            Cada caso é único. O que nos move é a confiança de quem entrega uma
            situação delicada em nossas mãos.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && testimonials.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm font-light">
            Seja o primeiro a deixar um depoimento.
          </div>
        )}

        {/* Testimonial cards */}
        {!loading && testimonials.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.id} className="relative flex flex-col">
                {/* Outer decorative frame */}
                <div className="absolute inset-0 border border-gold/10 rounded-sm translate-x-1.5 translate-y-1.5" />

                {/* Card */}
                <div className="relative flex flex-col h-full glass rounded-sm p-8 border border-white/8">
                  {/* Quote mark */}
                  <span className="font-serif text-6xl text-gold/20 leading-none select-none mb-4">
                    "
                  </span>

                  {/* Quote text */}
                  <p className="text-white/70 font-light leading-relaxed text-sm flex-1 -mt-4">
                    {t.text}
                  </p>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-gold/30 to-transparent my-6" />

                  {/* Attribution */}
                  <div className="flex items-center gap-3">
                    {t.authorPhoto ? (
                      <img
                        src={t.authorPhoto}
                        alt={t.authorName}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-gold text-xs font-serif font-bold">
                          {t.authorName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{t.authorName}</p>
                      <p className="text-gold text-[11px] tracking-wide font-light">
                        {t.context}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-14 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://wa.me/5548984695233?text=Olá, gostaria de agendar uma consulta."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gold text-dark font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-300 rounded-sm shadow-lg shadow-gold/20"
          >
            <WhatsAppIcon />
            Agendar Consulta
          </a>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white/70 font-light text-sm tracking-wide hover:border-gold hover:text-gold transition-all duration-300 rounded-sm"
          >
            <PenIcon />
            Deixar um depoimento
          </button>
        </div>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {showForm && <TestimonialForm onClose={() => setShowForm(false)} />}
    </section>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}
