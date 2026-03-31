import { useState } from 'react'
import { ChevronDown, HardHat, Shield, Briefcase, Building2, Heart } from 'lucide-react'

const areas = [
  {
    label: 'Trabalhista',
    icon: HardHat,
    faqs: [
      {
        question: 'Fui demitido sem justa causa. Quais são meus direitos?',
        answer:
          'Na demissão sem justa causa você tem direito a: aviso prévio (trabalhado ou indenizado), saldo de salário, férias proporcionais + 1/3, 13º proporcional, multa de 40% sobre o FGTS e liberação do saldo do FGTS. Dependendo da situação, podem existir outros direitos. Agende uma consulta para análise do seu caso.',
      },
      {
        question: 'Posso processar meu empregador por horas extras não pagas?',
        answer:
          'Sim. Caso você tenha trabalhado além da jornada sem receber ou sem os devidos adicionais (50% em dias úteis, 100% aos domingos e feriados), é possível entrar com reclamação trabalhista para cobrar os valores retroativos dos últimos 5 anos.',
      },
      {
        question: 'O que é assédio moral no trabalho e o que posso fazer?',
        answer:
          'Assédio moral é a exposição repetida a situações humilhantes, constrangedoras ou vexatórias no ambiente de trabalho. Se você é vítima, pode pedir rescisão indireta (equivalente à demissão sem justa causa) e indenização por danos morais. Guarde registros, e-mails e testemunhas.',
      },
      {
        question: 'Quanto tempo tenho para entrar com reclamação trabalhista?',
        answer:
          'O prazo prescricional é de 2 anos após o fim do contrato de trabalho para ajuizar a ação, com direito de cobrar os últimos 5 anos de créditos. Não espere — quanto antes a assessoria jurídica for iniciada, melhor a coleta de provas.',
      },
      {
        question: 'Posso fazer acordo sem precisar ir à justiça?',
        answer:
          'Sim. Muitos casos trabalhistas são resolvidos por negociação direta ou mediação antes de qualquer processo. A representação por advogado nessas negociações garante que você não abra mão de direitos importantes por falta de informação.',
      },
    ],
  },
  {
    label: 'Consumidor',
    icon: Shield,
    faqs: [
      {
        question: 'Fui cobrado indevidamente. Tenho direito à devolução?',
        answer:
          'Sim. O Código de Defesa do Consumidor prevê a devolução em dobro do valor cobrado indevidamente — salvo engano justificável. Além disso, se a cobrança gerou negativação no seu nome, cabe indenização por danos morais.',
      },
      {
        question: 'Comprei um produto com defeito e a empresa não quer trocar. O que fazer?',
        answer:
          'Você tem direito à substituição do produto, ao abatimento proporcional do preço ou à devolução total do valor pago. O prazo para reclamar é de 90 dias para produtos duráveis e 30 dias para não duráveis. Guarde notas fiscais e registre todas as tentativas de solução.',
      },
      {
        question: 'Meu nome foi negativado indevidamente. Tenho direito à indenização?',
        answer:
          'Sim. A negativação indevida gera dano moral presumido — ou seja, não precisa provar o abalo, ele é reconhecido automaticamente. O valor da indenização varia conforme o caso, mas costuma ficar entre R$ 3.000 e R$ 15.000. Entre em contato para analisarmos.',
      },
      {
        question: 'Posso cancelar um serviço contratado pela internet?',
        answer:
          'Sim. Contratos celebrados fora do estabelecimento comercial (incluindo internet) garantem o direito de arrependimento em até 7 dias, com devolução integral do valor pago. Após esse prazo, as regras do contrato se aplicam, mas cláusulas abusivas podem ser contestadas.',
      },
      {
        question: 'A empresa não cumpriu o que prometeu na publicidade. O que posso fazer?',
        answer:
          'A oferta vincula o fornecedor. Se a empresa se recusar a cumprir o que foi anunciado, você pode exigir o cumprimento forçado, aceitar produto equivalente ou desfazer o negócio com devolução de valores. Em alguns casos cabe também indenização por danos morais.',
      },
    ],
  },
  {
    label: 'Cível',
    icon: Briefcase,
    faqs: [
      {
        question: 'Sofri um acidente causado por outra pessoa. Tenho direito à indenização?',
        answer:
          'Sim. Quem causa dano a outra pessoa é obrigado a repará-lo. Dependendo das circunstâncias, você pode ter direito à indenização por danos materiais (despesas médicas, lucros cessantes) e morais (sofrimento, abalo psicológico). Guarde todos os documentos e registros do ocorrido.',
      },
      {
        question: 'Alguém me deve dinheiro e não quer pagar. Como cobrar na justiça?',
        answer:
          'Existem diferentes caminhos: ação de cobrança, ação monitória ou execução (se houver título executivo como cheque ou contrato). A estratégia mais adequada depende dos documentos que você tem. Agende uma consulta para analisarmos o melhor caminho.',
      },
      {
        question: 'Assinei um contrato e a outra parte não cumpriu. O que posso fazer?',
        answer:
          'Você pode exigir o cumprimento forçado do contrato ou pedir a rescisão com perdas e danos. Em muitos casos também cabe indenização. A análise do contrato é fundamental antes de qualquer decisão.',
      },
      {
        question: 'Qual é o prazo para entrar com uma ação cível?',
        answer:
          'O prazo varia conforme o tipo de ação: em geral, o prazo prescricional para reparação civil é de 3 anos. Para ações relacionadas a contratos, pode ser de até 10 anos. É importante não perder os prazos — procure orientação jurídica o quanto antes.',
      },
      {
        question: 'O que é dano moral e quando tenho direito a ele?',
        answer:
          'Dano moral é a lesão a direitos da personalidade: honra, imagem, intimidade, dignidade. Situações como negativação indevida, exposição vexatória, humilhação pública, entre outras, podem gerar indenização. O valor é arbitrado pelo juiz conforme a gravidade do caso.',
      },
    ],
  },
  {
    label: 'Empresarial',
    icon: Building2,
    faqs: [
      {
        question: 'Preciso de advogado para abrir minha empresa?',
        answer:
          'Não é obrigatório por lei, mas é altamente recomendado. Um advogado garante que o contrato social proteja os sócios adequadamente, escolhe o tipo societário correto para o seu negócio e evita cláusulas que podem gerar conflitos e prejuízos futuros.',
      },
      {
        question: 'Meu sócio quer sair da empresa. Como proceder?',
        answer:
          'A dissolução parcial da sociedade segue o que está previsto no contrato social. O sócio que sai tem direito à apuração dos seus haveres (valor da sua participação na empresa). Uma assessoria jurídica garante que esse processo seja feito corretamente, sem prejudicar nenhuma das partes.',
      },
      {
        question: 'Como proteger minha empresa de processos trabalhistas?',
        answer:
          'Boas práticas contratuais, registros adequados de jornada, políticas internas claras e revisão periódica dos contratos de trabalho reduzem significativamente o risco de ações trabalhistas. A assessoria preventiva é sempre mais barata do que a defesa em processos.',
      },
      {
        question: 'Um cliente inadimplente está prejudicando meu negócio. O que fazer?',
        answer:
          'Dependendo do valor e dos documentos disponíveis (contrato, notas fiscais, boletos), é possível entrar com ação de cobrança, protesto em cartório ou negativação. A estratégia correta acelera a recuperação do crédito e minimiza custos.',
      },
      {
        question: 'Como revisar contratos empresariais para evitar riscos?',
        answer:
          'A revisão contratual identifica cláusulas abusivas, lacunas que podem gerar interpretações desfavoráveis e desequilíbrios entre as partes. Antes de assinar qualquer contrato relevante para o seu negócio, a análise jurídica é indispensável.',
      },
    ],
  },
  {
    label: 'Consultoria',
    icon: Heart,
    faqs: [
      {
        question: 'O que é consultoria jurídica preventiva?',
        answer:
          'É a assessoria jurídica voltada a identificar e eliminar riscos antes que se tornem problemas. Inclui análise de contratos, orientação em decisões importantes e estruturação de processos internos. Prevenir é sempre mais econômico do que litigar.',
      },
      {
        question: 'Como funciona o atendimento online?',
        answer:
          'O atendimento online é realizado por videochamada ou WhatsApp, com total segurança e confidencialidade. Os documentos são enviados digitalmente e assinados eletronicamente. Atendo em todo o Brasil com a mesma qualidade do atendimento presencial.',
      },
      {
        question: 'Preciso de um advogado fixo para minha empresa ou posso consultar pontualmente?',
        answer:
          'Você pode optar por consultoria pontual (para situações específicas) ou por acompanhamento contínuo, dependendo das necessidades do seu negócio ou da complexidade da sua situação. Conversa comigo e encontramos o modelo mais adequado para o seu caso.',
      },
      {
        question: 'Como sei se preciso de um advogado agora?',
        answer:
          'Se você está diante de um contrato importante, de uma notificação, de uma demissão, de uma cobrança indevida ou de qualquer situação que envolva seus direitos — a resposta é sim. Uma consulta inicial esclarece se há urgência e qual o melhor caminho a seguir.',
      },
      {
        question: 'Qual a diferença entre consultoria e contencioso?',
        answer:
          'Consultoria é a atuação preventiva e orientativa — análise de contratos, orientação jurídica, estruturação de negócios. Contencioso é a atuação em processos judiciais ou administrativos já instaurados. Idealmente, uma boa consultoria reduz a necessidade de contencioso.',
      },
    ],
  },
]

export default function FAQ() {
  const [activeArea, setActiveArea] = useState(0)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleAreaChange = (i: number) => {
    setActiveArea(i)
    setOpenIndex(null)
  }

  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i))

  const current = areas[activeArea]

  return (
    <section id="faq" className="relative bg-dark py-24 overflow-hidden">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Decorative glow */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="section-padding max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-gold" />
            <span className="text-gold text-xs font-medium tracking-[0.3em] uppercase">
              Dúvidas Frequentes
            </span>
            <div className="h-px w-8 bg-gold" />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight">
            Perguntas <span className="gold-text">frequentes</span>
          </h2>
          <p className="text-white/50 mt-4 max-w-xl mx-auto font-light leading-relaxed">
            Selecione a área e encontre respostas para as dúvidas mais comuns.
          </p>
        </div>

        {/* Area tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {areas.map((area, i) => {
            const Icon = area.icon
            const isActive = activeArea === i
            return (
              <button
                key={area.label}
                onClick={() => handleAreaChange(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-sm border text-sm font-medium tracking-wide transition-all duration-300 ${
                  isActive
                    ? 'bg-gold text-dark border-gold'
                    : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
                }`}
              >
                <Icon size={14} />
                {area.label}
              </button>
            )
          })}
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {current.faqs.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                className={`border rounded-sm transition-all duration-300 ${
                  isOpen
                    ? 'border-gold/40 bg-dark-100'
                    : 'border-white/8 bg-dark-100 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span
                    className={`font-serif font-semibold text-base leading-snug transition-colors duration-300 ${
                      isOpen ? 'text-gold' : 'text-white'
                    }`}
                  >
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-gold transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-400 ${
                    isOpen ? 'max-h-64' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 pb-6">
                    <div className="h-px bg-gradient-to-r from-gold/30 to-transparent mb-4" />
                    <p className="text-white/60 font-light leading-relaxed text-sm">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm font-light mb-5">
            Não encontrou a resposta que procurava?
          </p>
          <a
            href="https://wa.me/5548998499131?text=Olá, tenho uma dúvida jurídica e gostaria de conversar."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gold text-dark font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-300 rounded-sm shadow-lg shadow-gold/20"
          >
            <WhatsAppIcon />
            Fale com a Dra. Hemilly
          </a>
        </div>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
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
