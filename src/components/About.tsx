import { Award, BookOpen, Users } from "lucide-react";

const highlights = [
  { icon: Award, label: "OAB Ativa", value: "OAB/SC 70.150" },
  { icon: BookOpen, label: "Especialização", value: "Dir. do Trabalho" },
  { icon: Users, label: "Atuação", value: "Consultiva & Contenciosa" },
];

export default function About() {
  return (
    <section id="sobre" className="relative bg-dark-100 py-24 overflow-hidden">
      {/* Top border line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Decorative element */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="section-padding max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: decorative card */}
          <div className="relative flex justify-center lg:justify-start">
            <div className="relative w-full max-w-md">
              {/* Outer decorative frame */}
              <div className="absolute inset-0 border border-gold/20 rounded-sm translate-x-3 translate-y-3" />

              {/* Main card */}
              <div className="relative glass rounded-sm p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-gold/60 to-transparent" />
                  <span className="text-gold text-xs tracking-[0.3em] uppercase font-medium">
                    Sobre
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-gold/60 to-transparent" />
                </div>

                <blockquote className="font-serif text-xl text-white/90 leading-relaxed italic mb-6">
                  "O Direito não é apenas uma profissão — é um compromisso com a
                  justiça e com as pessoas."
                </blockquote>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-px bg-gold" />
                  <span className="text-gold text-sm font-medium">
                    Dra. Hemilly Fátima
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/5">
                  {highlights.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="text-center">
                      <Icon size={18} className="text-gold mx-auto mb-2" />
                      <p className="font-serif font-bold text-white text-sm">
                        {value}
                      </p>
                      <p className="text-white/40 text-[10px] tracking-wide uppercase mt-0.5">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: text content */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-gold" />
                <span className="text-gold text-xs font-medium tracking-[0.3em] uppercase">
                  Quem sou eu
                </span>
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight">
                Advocacia com <br />
                <span className="gold-text">propósito</span>
              </h2>
            </div>

            <div className="flex flex-col gap-4 text-white/60 font-light leading-relaxed">
              <p>
                Sou a Dra. Hemilly Fátima Guilherme, advogada formada pela
                Universidade do Vale do Itajaí (UNIVALI) e pós-graduada em
                Direito e Processo do Trabalho. Atuo de forma consultiva e
                contenciosa, com comprometimento, ética e técnica em cada
                demanda.
              </p>
              <p>
                Tenho experiência na elaboração de peças processuais,
                participação em audiências, sustentações orais e atendimento
                jurídico personalizado. Meu perfil proativo me permite analisar
                estrategicamente cada processo, negociar e resolver conflitos
                aliando conhecimento técnico à prática forense.
              </p>
              <p>
                Atendendo em todo o Brasil, com foco na defesa dos interesses dos
                clientes e na prevenção de litígios.
              </p>
            </div>

            {/* Credentials */}
            <div className="flex flex-col gap-3 mt-2">
              {[
                "Bacharel em Direito — UNIVALI, Campus Kobrasol (2022)",
                "Pós-Graduada em Direito e Processo do Trabalho — UNISC/CEISC (2025)",
                "Aprovada no XXXVIII Exame da OAB/SC",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                  <span className="text-white/60 text-sm font-light">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom border line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </section>
  );
}
