// src/pages/Register.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

export default function Register() {
  const navigate = useNavigate();
  
  // Registration steps: 'details' -> 'otp' -> 'password'
  const [step, setStep] = useState('details');

  const [formData, setFormData] = useState({
    name: '', email: '', otp: '', password: '', confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (errors[e.target.id]) setErrors({ ...errors, [e.target.id]: '' });
  };

  // Step 1: Send OTP Handler
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');
    const newErrors = {};

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (!nameRegex.test(formData.name)) {
      newErrors.name = "Full name must only contain letters and spaces";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/api/auth/send-otp', {
        name: formData.name,
        email: formData.email
      });
      setSuccessMessage('OTP sent to your email! Check your console/inbox.');
      setStep('otp');
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP Handler
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!formData.otp.trim()) {
      setErrors({ otp: "Please enter the OTP" });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/api/auth/verify-otp', {
        email: formData.email,
        otp_code: formData.otp
      });
      setSuccessMessage('Email verified successfully! Please set your password.');
      setStep('password');
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Invalid or expired OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Final Registration Handler
  const handleFinalRegister = async (e) => {
    e.preventDefault();
    setServerError('');
    const newErrors = {};

    const password = formData.password;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!hasLetter || !hasNumber || !hasSpecial) {
      newErrors.password = "Password must contain a letter, number, and special character";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/api/auth/complete-register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: "student"
      });
      navigate('/login');
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-panel { 
          background: rgba(17, 25, 40, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
        }
        .bg-grid {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#0a0f1c] text-[#dae2fd]" style={{ fontFamily: "'Inter', sans-serif" }}>
        
        <div className="absolute inset-0 z-0 bg-grid pointer-events-none"></div>

        <main className="relative z-10 w-full max-w-[540px]">
          <div className="glass-panel rounded-2xl p-8 md:p-12 transition-all duration-500">
            
            <header className="text-center mb-10">
              <div className="inline-block mb-4">
                <span className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm font-bold tracking-widest text-blue-400 uppercase">
                  Campus Events
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2 mt-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Create your account
              </h1>
              <p className="text-[#8c909f] text-sm md:text-base">
                {step === 'details' && "Enter your name and email to receive an OTP."}
                {step === 'otp' && "Enter the 6-digit verification code sent to your email."}
                {step === 'password' && "Create a secure password for your account."}
              </p>
            </header>

            {serverError && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">error</span>
                <span className="font-medium">{serverError}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {/* STEP 1: Name and Email */}
            {step === 'details' && (
              <form className="space-y-5" onSubmit={handleSendOtp} noValidate>
                <div className="space-y-1.5 group">
                  <label className="block text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">Full Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#8c909f]">person</span>
                    <input
                      className={`w-full bg-[#1e293b]/50 border text-white px-12 py-3.5 rounded-xl ${errors.name ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                      id="name" placeholder="John Doe" type="text" value={formData.name} onChange={handleInputChange}
                    />
                  </div>
                  {errors.name && <p className="text-red-400 text-xs ml-1 mt-1 font-medium">{errors.name}</p>}
                </div>

                <div className="space-y-1.5 group">
                  <label className="block text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#8c909f]">mail</span>
                    <input
                      className={`w-full bg-[#1e293b]/50 border text-white px-12 py-3.5 rounded-xl ${errors.email ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                      id="email" placeholder="student@college.edu" type="email" value={formData.email} onChange={handleInputChange}
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs ml-1 mt-1 font-medium">{errors.email}</p>}
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full mt-4 py-4 px-4 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50"
                  type="submit"
                >
                  {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 'otp' && (
              <form className="space-y-5" onSubmit={handleVerifyOtp} noValidate>
                <div className="space-y-1.5 group">
                  <label className="block text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">Enter OTP Code</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#8c909f]">lock_reset</span>
                    <input
                      className={`w-full bg-[#1e293b]/50 border text-white px-12 py-3.5 rounded-xl tracking-widest text-lg ${errors.otp ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                      id="otp" placeholder="123456" type="text" maxLength="6" value={formData.otp} onChange={handleInputChange}
                    />
                  </div>
                  {errors.otp && <p className="text-red-400 text-xs ml-1 mt-1 font-medium">{errors.otp}</p>}
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setStep('details')}
                    className="w-1/3 py-4 text-sm font-bold rounded-xl border border-white/10 text-[#8c909f] hover:text-white"
                  >
                    Back
                  </button>
                  <button 
                    disabled={isSubmitting}
                    className="w-2/3 py-4 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50"
                    type="submit"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Password & Confirm Password */}
            {step === 'password' && (
              <form className="space-y-5" onSubmit={handleFinalRegister} noValidate>
                <div className="space-y-1.5 group">
                  <label className="block text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#8c909f]">lock</span>
                    <input
                      className={`w-full bg-[#1e293b]/50 border text-white px-11 py-3.5 rounded-xl ${errors.password ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                      id="password" placeholder="••••••••" type="password" value={formData.password} onChange={handleInputChange}
                    />
                  </div>
                  {errors.password && <p className="text-red-400 text-xs ml-1 mt-1 font-medium">{errors.password}</p>}
                </div>

                <div className="space-y-1.5 group">
                  <label className="block text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">Confirm Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#8c909f]">lock</span>
                    <input
                      className={`w-full bg-[#1e293b]/50 border text-white px-11 py-3.5 rounded-xl ${errors.confirmPassword ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
                      id="confirmPassword" placeholder="••••••••" type="password" value={formData.confirmPassword} onChange={handleInputChange}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-xs ml-1 mt-1 font-medium">{errors.confirmPassword}</p>}
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full mt-4 py-4 px-4 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50"
                  type="submit"
                >
                  {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </form>
            )}

            <footer className="mt-8 text-center">
              <p className="text-sm text-[#8c909f]">
                Already have an account? 
                <Link to="/login" className="text-blue-400 font-bold ml-1.5 hover:text-white transition-colors">
                  Sign in 
                </Link>
              </p>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}