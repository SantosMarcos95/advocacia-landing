import { useState } from 'react'
import { Heart, Shield, Briefcase, HardHat, Building2 } from 'lucide-react'

const areas = [
  {
    icon: HardHat,
    title: 'Direito Trabalhista',
    subtitle: 'e Processo do Trabalho',
    description:
      'Especialização em Direito e Processo do Trabalho, com atuação em reclamações trabalhistas, audiências e sustentações orais. Defesa dos seus direitos nas relações de trabalho.',
    topics: ['Reclamação trabalhista', 'Rescisão indevida', 'Horas extras e Cáulculo de verbas rescisórias', 'Assédio moral e sexual'],
  },
  {
    icon: Shield,
    title: 'Direito do Consumidor',
    subtitle: 'e Relações de Consumo',
    description:
      'Experiência em demandas consumeristas e atuação conciliatória. Proteção dos seus direitos frente a fornecedores, empresas e prestadores de serviço.',
    topics: ['Cobranças indevidas', 'Vícios em produtos e serviços', 'Negativação indevida', 'Conciliação e mediação'],
  },
  {
    icon: Briefcase,
    title: 'Direito Cível',
    subtitle: 'Ações Individuais e Coletivas',
    description:
      'Atuação estratégica em ações cíveis individuais e coletivas, com elaboração de peças processuais de alta complexidade e análise de jurisprudência.',
    topics: ['Ações indenizatórias', 'Responsabilidade civil', 'Contratos e obrigações', 'Recursos e execuções'],
  },
  {
    icon: Building2,
    title: 'Direito Empresarial',
    subtitle: 'e Assessoria Corporativa',
    description:
      'Assessoria jurídica completa para empresas e empreendedores, desde a constituição societária até a resolução de conflitos empresariais, com foco em segurança e crescimento do negócio.',
    topics: ['Constituição e dissolução de empresas', 'Contratos empresariais', 'Recuperação de crédito', 'Conflitos societários'],
  },
  {
    icon: Heart,
    title: 'Consultoria Jurídica',
    subtitle: 'e Assessoria Preventiva',
    description:
      'Atendimento jurídico personalizado e consultivo para prevenir litígios e orientar decisões com segurança. Foco na defesa dos seus interesses e na obtenção de resultados eficientes.',
    topics: ['Análise de contratos', 'Estratégia processual', 'Orientação e assessoria', 'Prevenção de litígios'],
  },
]

export default function PracticeAreas() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section id="areas" aria-label="Áreas de Atuação — Direito Trabalhista, Consumidor, Cível, Empresarial e Consultoria Jurídica" className="relative bg-dark py-24 overflow-hidden">
      {/* Decorative */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gold/4 rounded-full blur-[80px] pointer-events-none" />

      <div className="section-padding max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-gold" />
            <span className="text-gold text-xs font-medium tracking-[0.3em] uppercase">
              Especialidades
            </span>
            <div className="h-px w-8 bg-gold" />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight">
            Áreas de <span className="gold-text">Atuação</span>
          </h2>
          <p className="text-white/50 mt-4 max-w-xl mx-auto font-light leading-relaxed">
            Atendimento especializado em quatro frentes do Direito, sempre com foco nas suas necessidades.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {areas.map((area, index) => {
            const Icon = area.icon
            const isHovered = hovered === index

            return (
              <div
                key={area.title}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                className="relative group cursor-default"
              >
                {/* Glow effect */}
                <div
                  className={`absolute inset-0 bg-gold/5 rounded-sm blur-xl transition-opacity duration-500 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Card */}
                <div
                  className={`relative h-full flex flex-col p-7 rounded-sm border transition-all duration-500 ${
                    isHovered
                      ? 'border-gold/50 bg-dark-200'
                      : 'border-white/8 bg-dark-100'
                  }`}
                >
                  {/* Number */}
                  <span className="absolute top-5 right-6 font-serif text-5xl font-bold text-white/4 select-none">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-sm flex items-center justify-center mb-6 transition-all duration-500 ${
                      isHovered ? 'bg-gold text-dark' : 'bg-gold/10 text-gold'
                    }`}
                  >
                    <Icon size={22} />
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-white text-lg leading-tight mb-1">
                    {area.title}
                  </h3>
                  <p className="text-gold text-xs font-medium tracking-wide mb-4">
                    {area.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-white/55 text-sm font-light leading-relaxed mb-6 flex-1">
                    {area.description}
                  </p>

                  {/* Topics */}
                  <ul className="flex flex-col gap-2">
                    {area.topics.map((topic) => (
                      <li key={topic} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                        <span className="text-white/45 text-xs font-light">{topic}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Bottom accent line */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gold transition-transform duration-500 origin-left ${
                      isHovered ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
