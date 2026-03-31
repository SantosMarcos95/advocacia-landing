const contacts = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    handle: '(48) 98469-5233',
    description: 'Atendimento rápido e agendamento de consultas',
    cta: 'Enviar mensagem',
    href: 'https://wa.me/5548984695233?text=Olá, gostaria de agendar uma consulta.',
    colors: {
      bg: 'hover:bg-[#25D366]/10',
      border: 'hover:border-[#25D366]/50',
      icon: 'group-hover:bg-[#25D366] group-hover:text-white',
      iconBg: 'bg-[#25D366]/10 text-[#25D366]',
      cta: 'text-[#25D366]',
    },
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: '/in/hemilly-fátima',
    description: 'Trajetória profissional e publicações jurídicas',
    cta: 'Ver perfil',
    href: 'https://linkedin.com/in/hemilly-fátima-033824282',
    colors: {
      bg: 'hover:bg-[#0A66C2]/10',
      border: 'hover:border-[#0A66C2]/50',
      icon: 'group-hover:bg-[#0A66C2] group-hover:text-white',
      iconBg: 'bg-[#0A66C2]/10 text-[#0A66C2]',
      cta: 'text-[#0A66C2]',
    },
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@hemillyfatimaadv',
    description: 'Conteúdo jurídico e atualizações profissionais',
    cta: 'Ver perfil',
    href: 'https://instagram.com/hemillyfatimaadv',
    colors: {
      bg: 'hover:bg-[#E1306C]/10',
      border: 'hover:border-[#E1306C]/50',
      icon: 'group-hover:bg-[#E1306C] group-hover:text-white',
      iconBg: 'bg-[#E1306C]/10 text-[#E1306C]',
      cta: 'text-[#E1306C]',
    },
  },
  {
    id: 'email',
    label: 'E-mail',
    handle: 'hemillyfatimaadv@gmail.com',
    description: 'Envie sua dúvida ou solicite uma consulta por e-mail',
    cta: 'Enviar e-mail',
    href: 'mailto:hemillyfatimaadv@gmail.com',
    colors: {
      bg: 'hover:bg-gold/10',
      border: 'hover:border-gold/50',
      icon: 'group-hover:bg-gold group-hover:text-dark',
      iconBg: 'bg-gold/10 text-gold',
      cta: 'text-gold',
    },
  },
]

export default function Contact() {
  return (
    <section id="contato" className="relative bg-dark-100 py-24 overflow-hidden">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gold/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="section-padding max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-gold" />
            <span className="text-gold text-xs font-medium tracking-[0.3em] uppercase">
              Entre em Contato
            </span>
            <div className="h-px w-8 bg-gold" />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Vamos <span className="gold-text">conversar?</span>
          </h2>
          <p className="text-white/50 max-w-lg mx-auto font-light leading-relaxed">
            Estou disponível para tirar dúvidas, agendar consultas e oferecer orientação jurídica.
            Escolha o canal de sua preferência.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {contacts.map((contact) => (
            <a
              key={contact.id}
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative flex flex-col items-center text-center p-8 rounded-sm border border-white/8 bg-dark-200 transition-all duration-400 ${contact.colors.bg} ${contact.colors.border}`}
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 transition-all duration-400 ${contact.colors.iconBg} ${contact.colors.icon}`}
              >
                <SocialIcon id={contact.id} />
              </div>

              {/* Label */}
              <h3 className="font-serif font-bold text-white text-xl mb-1">{contact.label}</h3>
              <p className="text-white/40 text-sm mb-3">{contact.handle}</p>
              <p className="text-white/55 text-xs font-light leading-relaxed mb-6 flex-1">
                {contact.description}
              </p>

              {/* CTA */}
              <span className={`text-xs font-semibold tracking-widest uppercase flex items-center gap-2 ${contact.colors.cta}`}>
                {contact.cta}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gold group-hover:w-1/2 transition-all duration-400" />
            </a>
          ))}
        </div>

        {/* Location info */}
        <div className="mt-14 text-center">
          <div className="inline-flex items-center gap-3 glass px-8 py-4 rounded-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <p className="text-white/60 text-sm font-light">
              <span className="text-white/90 font-medium">Grande Florianópolis, SC</span>
              {' '}·{' '}
              Atendimento presencial e online para todo o Brasil
            </p>
          </div>
        </div>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </section>
  )
}

function SocialIcon({ id }: { id: string }) {
  if (id === 'whatsapp') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    )
  }
  if (id === 'linkedin') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )
  }
  if (id === 'instagram') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    )
  }
  if (id === 'email') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    )
  }
  return null
}
