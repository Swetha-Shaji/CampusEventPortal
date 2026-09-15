// src/pages/AdminLogin.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

const API_URL = "/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (errors[e.target.id]) setErrors({ ...errors, [e.target.id]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validateForm()) return; 

    setIsSubmitting(true);
    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password
      };

      const response = await axios.post(`${API_URL}/login`, payload);
      const token = response.data.access_token;
      
      sessionStorage.removeItem("token");
      sessionStorage.setItem('token', token);

      const userRes = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = userRes.data;

      if (user.role !== "admin" && !user.is_admin) {
        sessionStorage.removeItem("token");
        setServerError("Access denied. This portal is strictly for administrators.");
        setIsSubmitting(false);
        return;
      }

      navigate("/admin-dashboard");
      } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem("token");
      }
      
      // Extract the EXACT error message sent by FastAPI (or fallback to network error)
      const exactError = err.response?.data?.detail || err.message || "Login failed";
      
      setServerError(exactError);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-panel { 
          background: rgba(25, 10, 15, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6);
        }
        .bg-grid {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
        /* Static Non-Moving Gradient Background */
        .static-gradient-bg {
          background: radial-gradient(circle at 20% 20%, rgba(220, 38, 38, 0.18) 0%, transparent 40%),
                      radial-gradient(circle at 80% 80%, rgba(234, 88, 12, 0.15) 0%, transparent 40%),
                      #0d0508;
        }
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active{
            -webkit-box-shadow: 0 0 0 30px #2d1b22 inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden static-gradient-bg text-[#dae2fd]" style={{ fontFamily: "'Inter', sans-serif" }}>
        
        <div className="absolute inset-0 z-0 bg-grid pointer-events-none"></div>

        <main className="relative z-10 w-full max-w-[440px]">
          <div className="glass-panel rounded-2xl p-8 md:p-12 transition-all duration-500 hover:border-red-500/20">
            
            <header className="text-center mb-10">
              <div className="inline-block mb-4">
                <span className="px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-sm font-bold tracking-widest text-red-400 uppercase shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  Admin Portal
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2 mt-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Secure Login
              </h1>
              <p className="text-[#8c909f] text-sm md:text-base">Authorized personnel only.</p>
            </header>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {serverError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-pulse">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span className="font-medium">{serverError}</span>
                </div>
              )}

              <div className="space-y-1.5 group">
                <label className="block text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1 group-focus-within:text-red-400 transition-colors">Admin Email</label>
                <div className="relative">
                  <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl transition-colors duration-300 ${errors.email ? 'text-red-500' : 'text-[#8c909f] group-focus-within:text-red-400'}`}>shield_person</span>
                  <input
                    className={`w-full bg-[#1c1216]/80 border focus:ring-4 focus:outline-none text-white px-12 py-3.5 rounded-xl transition-all duration-300 placeholder:text-[#8c909f]/50 ${errors.email ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:border-red-500 focus:ring-red-500/20 hover:border-white/20'}`}
                    id="email" placeholder="admin@college.edu" type="email" value={formData.email} onChange={handleInputChange}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs ml-1 mt-1 font-medium">{errors.email}</p>}
              </div>

              <div className="space-y-1.5 group">
                <label className="block text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1 group-focus-within:text-red-400 transition-colors">Password</label>
                <div className="relative">
                  <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl transition-colors duration-300 ${errors.password ? 'text-red-500' : 'text-[#8c909f] group-focus-within:text-red-400'}`}>lock</span>
                  
                  <input
                    className={`w-full bg-[#1c1216]/80 border focus:ring-4 focus:outline-none text-white px-12 py-3.5 rounded-xl transition-all duration-300 placeholder:text-[#8c909f]/50 ${errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:border-red-500 focus:ring-red-500/20 hover:border-white/20'}`}
                    id="password" placeholder="••••••••" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8c909f] hover:text-white transition-colors cursor-pointer focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs ml-1 mt-1 font-medium">{errors.password}</p>}
              </div>

              <div className="pt-6">
                <button 
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  type="submit"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <span className="relative text-lg font-extrabold tracking-wide" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {isSubmitting ? 'Authenticating...' : 'Sign In'}
                  </span>
                </button>
              </div>
            </form>

          </div>
        </main>
      </div>
    </>
  );
}