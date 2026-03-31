import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Início', href: '#inicio' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Áreas', href: '#areas' },
  { label: 'Depoimentos', href: '#depoimentos' },
  { label: 'Contato', href: '#contato' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLink = (href: string) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-dark/95 backdrop-blur-md border-b border-gold/10 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <nav className="section-padding max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => handleLink('#inicio')}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-full border-2 border-gold flex items-center justify-center bg-gold/10">
            <span className="font-serif font-bold text-gold text-sm">HF</span>
          </div>
          <div className="hidden sm:block">
            <p className="font-serif font-semibold text-white text-sm leading-tight">
              Hemilly Fátima
            </p>
            <p className="text-gold text-[10px] font-light tracking-widest uppercase">
              Advocacia
            </p>
          </div>
        </button>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <button
                onClick={() => handleLink(link.href)}
                className="text-sm font-light text-white/70 hover:text-gold transition-colors duration-300 tracking-wide relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold group-hover:w-full transition-all duration-300" />
              </button>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={() => handleLink('#contato')}
          className="hidden md:flex items-center gap-2 px-5 py-2.5 border border-gold text-gold text-sm font-medium tracking-wide hover:bg-gold hover:text-dark transition-all duration-300 rounded-sm"
        >
          Agendar Consulta
        </button>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white/80 hover:text-gold transition-colors"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-400 overflow-hidden ${
          menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-dark-200 border-t border-gold/10 px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleLink(link.href)}
              className="text-left text-white/80 hover:text-gold transition-colors font-light tracking-wide py-1"
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => handleLink('#contato')}
            className="mt-2 w-full py-3 border border-gold text-gold text-sm font-medium tracking-wide hover:bg-gold hover:text-dark transition-all duration-300"
          >
            Agendar Consulta
          </button>
        </div>
      </div>
    </header>
  )
}
