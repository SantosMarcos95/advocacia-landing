import { ChevronDown } from "lucide-react";
import fotoPerfil from "../img/Dra Hemilly.jpeg";

export default function Hero() {
  const scrollToAbout = () => {
    document.querySelector("#sobre")?.scrollIntoView({ behavior: "smooth" });
  };

  const openWhatsApp = () => {
    window.open(
      "https://wa.me/5548984695233?text=Olá, gostaria de agendar uma consulta.",
      "_blank"
    );
  };

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden bg-dark"
    >
      {/* Background elements */}
      <div className="absolute inset-0">
        {/* Gradient radial top-left */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        {/* Gradient radial bottom-right */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 section-padding max-w-7xl mx-auto w-full pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text content */}
          <div className="order-2 lg:order-1 flex flex-col gap-6 animate-fade-in-up">
            {/* Badge */}
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-gold" />
              <span className="text-gold text-xs font-medium tracking-[0.3em] uppercase">
                Advocacia &amp; Consultoria Jurídica
              </span>
            </div>

            {/* Name */}
            <div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1]">
                Dra. Hemilly
                <br />
                <span className="gold-text">Fátima</span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-white/60 text-lg font-light leading-relaxed max-w-md">
              Você não deveria enfrentar questões jurídicas sozinho. Defesa
              especializada em Direito Trabalhista, do Consumidor, Cível e
              Empresarial — com atendimento humanizado e estratégico em todo o
              Brasil.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <button
                onClick={openWhatsApp}
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-gold text-dark font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-300 rounded-sm shadow-lg shadow-gold/20"
              >
                <WhatsAppIcon />
                Agendar Consulta
              </button>
              <button
                onClick={scrollToAbout}
                className="flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white/80 font-light text-sm tracking-wide hover:border-gold hover:text-gold transition-all duration-300 rounded-sm"
              >
                Saiba Mais
                <ChevronDown size={16} />
              </button>
            </div>

            {/* OAB badge */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-2 glass px-4 py-2 rounded-sm">
                <ScalesIcon />
                <span className="text-white/50 text-xs tracking-wide">
                  OAB/SC 70.150
                </span>
              </div>
            </div>
          </div>

          {/* Right: Photo */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end animate-fade-in">
            <div className="relative">
              {/* Decorative ring */}
              <div
                className="absolute inset-0 rounded-full border-2 border-gold/30 scale-110 animate-pulse"
                style={{ animationDuration: "4s" }}
              />
              <div className="absolute inset-0 rounded-full border border-gold/10 scale-125" />

              {/* Decorative corner accents */}
              <div className="absolute -top-4 -right-4 w-16 h-16 border-t-2 border-r-2 border-gold/60" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 border-b-2 border-l-2 border-gold/60" />

              {/* Profile photo container */}
              <div className="relative w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full overflow-hidden border-4 border-gold/40 shadow-2xl shadow-gold/10">
                <img
                  src={fotoPerfil}
                  alt="Dra. Hemilly Fátima Guilherme — Advogada em Florianópolis SC, OAB/SC 70.150"
                  className="w-full h-full object-cover object-[center_20%]"
                />
              </div>

              {/* Floating badge */}
              {/* <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-sm whitespace-nowrap text-center">
                <p className="text-gold text-xs font-semibold tracking-widest uppercase">+ 10 Anos de Experiência</p>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToAbout}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 hover:text-gold transition-colors animate-bounce"
        style={{ animationDuration: "2s" }}
      >
        <span className="text-xs tracking-widest uppercase">Rolar</span>
        <ChevronDown size={18} />
      </button>
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ScalesIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-gold"
    >
      <path d="M12 3v18M5 21h14M3 8l4-4m10 4l-4-4M7 8c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4zM21 8c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z" />
    </svg>
  );
}
