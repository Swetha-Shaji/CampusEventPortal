import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from "react";

const tailwindConfig = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-lowest": "#060e20",
        "on-primary-fixed": "#001a42",
        secondary: "#b6c4ff",
        "primary-fixed": "#d8e2ff",
        "on-surface-variant": "#c2c6d6",
        "on-primary": "#002e6a",
        "on-primary-container": "#00285d",
        "primary-fixed-dim": "#adc6ff",
        outline: "#8c909f",
        background: "#0b1326",
        error: "#ffb4ab",
        "surface-container-high": "#222a3d",
        "surface-container": "#171f33",
        primary: "#adc6ff",
        tertiary: "#ffb786",
        "surface-variant": "#2d3449",
        surface: "#0b1326",
        "on-surface": "#dae2fd",
      },
      fontFamily: {
        headline: ["Manrope"],
        body: ["Inter"],
      },
    },
  },
};

export default function SpotlightLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    const tailwindScript = document.createElement("script");
    tailwindScript.src = "https://cdn.tailwindcss.com?plugins=forms,container-queries";
    tailwindScript.onload = () => {
      if (window.tailwind) {
        window.tailwind.config = tailwindConfig;
      }
    };
    document.head.appendChild(tailwindScript);

    const fontLink1 = document.createElement("link");
    fontLink1.rel = "stylesheet";
    fontLink1.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;700;800&family=Inter:wght@300;400;500;600&display=swap";
    document.head.appendChild(fontLink1);

    const fontLink2 = document.createElement("link");
    fontLink2.rel = "stylesheet";
    fontLink2.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
    document.head.appendChild(fontLink2);

    return () => {
      document.head.removeChild(tailwindScript);
      document.head.removeChild(fontLink1);
      document.head.removeChild(fontLink2);
    };
  }, []);

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background-color: #0b1326; color: #dae2fd; }
        .font-headline { font-family: 'Manrope', sans-serif; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .asymmetric-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 2rem; }
        @media (max-width: 768px) { .asymmetric-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="dark bg-[#0b1326] text-[#dae2fd] selection:bg-[#4d8eff] selection:text-[#00285d]">
        <nav className="fixed top-0 w-full z-50 bg-[#0b1326] border-b border-[#2d3449]">
          <div className="flex justify-between items-center px-8 h-20 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 group cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate("/")}>
              <span className="material-symbols-outlined text-[36px] text-blue-500">flare</span>
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white ml-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Spotlight</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a className="text-[#b6c4ff]/70 hover:text-[#adc6ff] transition-colors duration-300" href="#features-section">Features</a>
              <a className="text-[#b6c4ff]/70 hover:text-[#adc6ff] transition-colors duration-300" href="#student-hub">Student Hub</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="px-4 py-2 bg-[#4d8eff] text-[#00285d] rounded-lg font-bold hover:brightness-110 transition-all text-sm">
                Sign In
              </Link>
            </div>
          </div>
        </nav>

        <main className="pt-20">
          <section className="relative min-h-[900px] flex items-center overflow-hidden px-8 bg-[#0b1326]">
            <div className="relative z-10 max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#2d3449] border border-[#424754] text-[#adc6ff] text-xs font-semibold tracking-wider uppercase">
                  Campus Event Student Portal
                </div>
                <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-tight text-white">
                  Discover, Join & <br /><span className="text-[#4d8eff]">Engage with Events.</span>
                </h1>
                <p className="text-lg md:text-xl text-[#c2c6d6] max-w-xl leading-relaxed">
                  Your central student hub to explore campus workshops, hackathons, team registrations, live Q&A discussions, and real-time coordinator updates.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/login" className="px-8 py-4 bg-[#ffb786] text-[#461f00] rounded-lg font-bold text-lg hover:brightness-110 transition-all shadow-xl inline-flex items-center justify-center">
                    Explore Events
                  </Link>
                </div>
              </div>
              <div className="relative hidden md:block flex items-center justify-center">
                <div className="relative rounded-2xl overflow-hidden border border-[#424754] shadow-2xl group">
                  <img
                    alt="Student experience overview"
                    className="w-full h-[550px] object-cover transition-all duration-700 group-hover:scale-105"
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80"
                  />
                </div>
              </div>
            </div>
          </section>

          <section id="features-section" className="py-32 px-8 bg-[#060e20]">
            <div className="max-w-7xl mx-auto">
              <div className="mb-20">
                <h2 className="text-4xl font-black font-headline tracking-tight mb-4">Student Features</h2>
                <div className="h-1 w-24 bg-[#4d8eff]"></div>
              </div>
              <div className="asymmetric-grid">
                <div className="space-y-6">
                  <div className="group p-8 rounded-2xl bg-[#222a3d] border border-[#424754] hover:bg-[#2d3449] transition-all duration-300">
                    <span className="material-symbols-outlined text-[#adc6ff] text-4xl mb-4 block">event_upcoming</span>
                    <h3 className="text-2xl font-bold font-headline mb-3 text-white">Smart Event Discovery & Filters</h3>
                    <p className="text-[#c2c6d6] leading-relaxed">Discover upcoming workshops, hackathons, seminars, and other events. Filter events by location, online or offline mode, and upcoming dates to quickly find what suits you.</p>
                  </div>
                  <div className="group p-8 rounded-2xl bg-[#222a3d] border border-[#424754] hover:bg-[#2d3449] transition-all duration-300">
                    <span className="material-symbols-outlined text-[#adc6ff] text-4xl mb-4 block">groups</span>
                    <h3 className="text-2xl font-bold font-headline mb-3 text-white">Individual & Team Registration</h3>
                    <p className="text-[#c2c6d6] leading-relaxed">Easily join the event on your own or team up with your friends. Register as an individual or create a team, and add your teammates.</p>
                  </div>
                </div>
                <div className="relative p-8 rounded-3xl bg-[#171f33] flex flex-col justify-between border border-[#424754]">
                  <div className="relative z-10">
                    <span className="material-symbols-outlined text-[#ffb786] text-5xl mb-6 block">forum</span>
                    <h3 className="text-3xl font-black font-headline mb-4 text-white">Real-Time Event Hub & Q&A</h3>
                    <p className="text-[#c2c6d6] mb-8 text-lg">Every registered event unlocks a dedicated discussion stream. Ask questions directly to event coordinators and view official answers alongside instant coordinator broadcast notifications.</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 bg-[#0b1326] p-4 rounded-xl border border-[#424754]">
                        <div className="w-10 h-10 rounded-full bg-[#ffb786]/20 flex items-center justify-center text-[#ffb786]">
                          <span className="material-symbols-outlined text-sm">campaign</span>
                        </div>
                        <div className="text-sm">
                          <p className="font-bold text-white">Broadcast Alerts</p>
                          <p className="text-[#c2c6d6] text-xs">Instant coordinator updates</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="student-hub" className="py-32 px-8 bg-[#0b1326]">
            <div className="max-w-5xl mx-auto bg-[#171f33] border border-[#424754] rounded-3xl p-8 md:p-14 text-center space-y-8">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-[#4d8eff]/20 rounded-2xl flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[#4d8eff] text-3xl">event</span>
                </div>
                <h3 className="text-3xl font-bold font-headline text-white">Explore Upcoming Campus Events</h3>
                <p className="text-[#c2c6d6] text-lg max-w-xl mx-auto leading-relaxed">
                  Browse through active workshops, hackathons, and fests happening across the campus.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-left pt-2">
                <Link to="/login" className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3] shadow-lg border border-[#424754] hover:border-blue-500 transition-all duration-300 bg-[#050810]">
                  <img 
                    src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80" 
                    alt="Tech Hackathon 2026" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70"
                  />
                  <div className="absolute top-2 left-2 bg-[#060e20] px-2.5 py-0.5 text-[10px] font-bold rounded-full text-purple-300 border border-purple-500/30">
                    Hackathon
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060e20] via-transparent to-transparent flex flex-col justify-end p-4">
                    <p className="text-white font-bold text-sm mb-0.5">InnovateX National Hackathon</p>
                  </div>
                </Link>

                <Link to="/login" className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3] shadow-lg border border-[#424754] hover:border-blue-500 transition-all duration-300 bg-[#050810]">
                  <img 
                    src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80" 
                    alt="AI Workshop" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70"
                  />
                  <div className="absolute top-2 left-2 bg-[#060e20] px-2.5 py-0.5 text-[10px] font-bold rounded-full text-blue-300 border border-blue-500/30">
                    Workshop
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060e20] via-transparent to-transparent flex flex-col justify-end p-4">
                    <p className="text-white font-bold text-sm mb-0.5">AI & Machine Learning Masterclass</p>
                  </div>
                </Link>

                <Link to="/login" className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[4/3] shadow-lg border border-[#424754] hover:border-blue-500 transition-all duration-300 bg-[#050810] hidden md:block">
                  <img 
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80" 
                    alt="College Fest" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70"
                  />
                  <div className="absolute top-2 left-2 bg-[#060e20] px-2.5 py-0.5 text-[10px] font-bold rounded-full text-orange-300 border border-orange-500/30">
                    College Fest
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060e20] via-transparent to-transparent flex flex-col justify-end p-4">
                    <p className="text-white font-bold text-sm mb-0.5">Annual Tech & Cultural Fest</p>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          <section className="py-32 px-8 relative overflow-hidden bg-[#060e20]">
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <h2 className="text-5xl md:text-6xl font-black font-headline tracking-tighter mb-8 leading-tight text-white">
                Ready to experience <span className="text-[#adc6ff]">Spotlight?</span>
              </h2>
              <p className="text-xl text-[#c2c6d6] mb-12 max-w-2xl mx-auto leading-relaxed">
                Connect with campus events, collaborate with peers, and stay informed with real-time updates.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link to="/login" className="px-10 py-5 bg-[#adc6ff] text-[#002e6a] rounded-lg font-black text-xl shadow-2xl hover:scale-105 transition-transform inline-flex items-center justify-center">
                  Get Started Now
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-[#060e20] w-full border-t border-[#2d3449]">
          <div className="flex flex-col md:flex-row justify-between items-center py-12 px-8 w-full max-w-7xl mx-auto">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[20px] text-[#adc6ff]">flare</span>
                <span className="text-lg font-bold text-[#adc6ff] font-headline">Spotlight</span>
              </div>
              <p className="text-sm font-medium text-[#b6c4ff]/50">© 2026 Spotlight Campus Event Portal. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}