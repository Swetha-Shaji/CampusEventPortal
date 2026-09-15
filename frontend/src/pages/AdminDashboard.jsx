// src/pages/AdminDashboard.jsx

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // -----------------------------
  // Profile States
  // -----------------------------
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [userEmail, setUserEmail] = useState("");
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [wantsToChangePassword, setWantsToChangePassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  const getToken = () => sessionStorage.getItem("token");

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/admin-login", { replace: true });
  };

  // -----------------------------
  // Fetch User Profile
  // -----------------------------
  const fetchUserProfile = async () => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = response.data;
      setUserName(user.name || "Admin");
      setUserEmail(user.email || "");
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        password: "",
      });
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [navigate]);

  // -----------------------------
  // Profile Handlers
  // -----------------------------
  const handleOpenProfile = async () => {
    setProfileMsg({ type: "", text: "" });
    setShowProfile(true);
    setIsEditingProfile(false);
    setWantsToChangePassword(false);
    await fetchUserProfile();
  };

  const handleCloseProfile = () => {
    if (isUpdatingProfile) return;
    setShowProfile(false);
    setIsEditingProfile(false);
    setWantsToChangePassword(false);
    setProfileMsg({ type: "", text: "" });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const name = profileData.name.trim();
    const email = profileData.email.trim();
    const password = profileData.password;

    // Validation: Name must only include letters and spaces
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!name || !nameRegex.test(name)) {
      setProfileMsg({ type: "error", text: "Full name must only include letters and spaces." });
      return;
    }

    // Validation: Email must be valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setProfileMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    // Validation: Password (if user chose to change it)
    if (wantsToChangePassword) {
      if (password.length < 6) {
        setProfileMsg({ type: "error", text: "Password must at least contain 6 characters." });
        return;
      }
      if (password.length > 65) {
        setProfileMsg({ type: "error", text: "Password must be only 65 characters long." });
        return;
      }
      if (/\s/.test(password)) {
        setProfileMsg({ type: "error", text: "Password must not contain spaces." });
        return;
      }
      if (!/[A-Za-z]/.test(password)) {
        setProfileMsg({ type: "error", text: "Password must include at least one letter." });
        return;
      }
      if (!/\d/.test(password)) {
        setProfileMsg({ type: "error", text: "Password must include at least one number." });
        return;
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        setProfileMsg({ type: "error", text: "Password must include at least one special character." });
        return;
      }
    }

    setIsUpdatingProfile(true);
    setProfileMsg({ type: "", text: "" });

    try {
      const token = getToken();
      const payload = { name, email };
      if (wantsToChangePassword && password) {
        payload.password = password;
      }

      const response = await axios.put(`${API_URL}/users/me`, payload, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      const updatedUser = response.data;
      
      // Save the freshly issued token to prevent 401 Unauthorized errors
      if (updatedUser.access_token) {
        sessionStorage.setItem("token", updatedUser.access_token);
      }

      setUserName(updatedUser.name || name);
      setUserEmail(updatedUser.email || email);
      
      setProfileData({
        name: updatedUser.name || name,
        email: updatedUser.email || email,
        password: "",
      });

      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => {
        setIsEditingProfile(false);
        setWantsToChangePassword(false);
        setProfileMsg({ type: "", text: "" });
        setShowProfile(false);
      }, 1200);
    } catch (err) {
      setProfileMsg({
        type: "error",
        text: err.response?.data?.detail || "Failed to update profile.",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "A");
  const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "Admin");

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-nav { background: rgba(10, 15, 28, 0.7); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .glass-card { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2); }
        .glass-modal { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .bg-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0a0f1c; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
        * { scrollbar-width: thin; scrollbar-color: #1e293b #0a0f1c; }
      `}</style>

      <div className="min-h-screen bg-[#0a0f1c] text-[#dae2fd]" style={{ fontFamily: "'Inter', sans-serif" }}>
        
        {/* Background Grids & Glows */}
        <div className="fixed inset-0 z-0 bg-grid pointer-events-none"></div>
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] -left-10 w-[500px] h-[500px] bg-red-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>
          <div className="absolute top-[20%] -right-20 w-[600px] h-[600px] bg-orange-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>
        </div>

        {/* ============================= */}
        {/* NAVBAR */}
        {/* ============================= */}
        <nav className="sticky top-0 z-40 glass-nav px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            
            {/* Logo Group */}
            <Link to="/admin-dashboard" className="flex items-center gap-2 group cursor-pointer hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[36px] bg-clip-text text-transparent bg-gradient-to-br from-red-500 to-orange-600 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] group-hover:drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] transition-all duration-300">
                flare
              </span>
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white ml-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Spotlight
              </span>
              <span className="hidden sm:flex ml-3 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-xs font-bold tracking-widest text-red-400 uppercase">
                Admin Portal
              </span>
            </Link>
            
            {/* Right Navbar */}
            <div className="flex items-center gap-3 md:gap-4 relative z-10">
              
              <button onClick={handleOpenProfile} className="flex items-center gap-3 px-3 py-2 md:pr-5 md:pl-2 rounded-full md:rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 hover:border-red-500/50 transition-all duration-300">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center text-sm font-bold shadow-md">
                  {getInitial(userName)}
                </div>
                <span className="hidden md:block text-sm tracking-wide">
                  {userName}
                </span>
              </button>

              {/* Instruction 'i' Icon Button on right side of admin profile */}
              <Link 
                to="/admin-instructions" 
                className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 hover:border-red-500/50 transition-all duration-300"
                title="Admin Instructions"
              >
                <span className="material-symbols-outlined text-xl">info</span>
              </Link>

              <button onClick={handleLogout} className="flex items-center justify-center w-10 h-10 md:w-auto md:px-4 md:py-2.5 rounded-full md:rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 hover:border-red-400 transition-all duration-300">
                <span className="material-symbols-outlined text-lg">logout</span>
                <span className="hidden md:block ml-2 text-sm">Logout</span>
              </button>
            </div>
          </div>
        </nav>

        {/* ============================= */}
        {/* MAIN CONTENT */}
        {/* ============================= */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Admin Overview
            </h1>
            <p className="text-[#8c909f] text-lg max-w-2xl">
              Manage system operations, users, and oversee platform activity.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8">
            <div onClick={() => navigate("/manage-users")} className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10 h-64 hover:border-red-500/30 hover:-translate-y-1 transition-all cursor-pointer group shadow-lg">
              <span className="material-symbols-outlined text-5xl text-red-400/50 mb-4 group-hover:text-red-400 group-hover:scale-110 transition-all">group</span>
              <h3 className="text-xl font-bold text-white group-hover:text-red-300 transition-colors">Participant Directory & Profiles</h3>
            </div>
            
            <div onClick={() => navigate("/manage-events")} className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10 h-64 hover:border-orange-500/30 hover:-translate-y-1 transition-all cursor-pointer group shadow-lg">
              <span className="material-symbols-outlined text-5xl text-orange-400/50 mb-4 group-hover:text-orange-400 group-hover:scale-110 transition-all">event_note</span>
              <h3 className="text-xl font-bold text-white group-hover:text-orange-300 transition-colors">Manage Events</h3>
            </div>

            <div onClick={() => navigate("/admin-report")} className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10 h-64 hover:border-blue-500/30 hover:-translate-y-1 transition-all cursor-pointer group shadow-lg">
              <span className="material-symbols-outlined text-5xl text-blue-400/50 mb-4 group-hover:text-blue-400 group-hover:scale-110 transition-all">bar_chart</span>
              <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">Platform Reports & Analytics</h3>
            </div>
          </div>
        </main>

        {/* ============================= */}
        {/* PROFILE MODAL */}
        {/* ============================= */}
        {showProfile && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) handleCloseProfile(); }}>
            <div className="glass-modal w-full max-w-md rounded-3xl p-8 relative animate-slide-up">
              
              {/* Header Controls */}
              <div className="absolute top-5 right-5 flex items-center gap-2">
                {!isEditingProfile && (
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all text-sm font-medium shadow-sm hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                  </button>
                )}
                <button 
                  onClick={handleCloseProfile} 
                  disabled={isUpdatingProfile} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Profile Avatar & Greeting */}
              <div className="text-center mb-8 mt-2">
                <div className="w-20 h-20 bg-gradient-to-tr from-red-500 to-orange-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  <span className="text-white text-3xl font-extrabold">{getInitial(userName)}</span>
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Hi, {getFirstName(userName)}!
                </h2>
                <p className="text-[#8c909f] text-sm mt-1">
                  {isEditingProfile ? "Update your admin details below" : "Review your admin details"}
                </p>
              </div>

              {/* Messaging */}
              {profileMsg.text && (
                <div className={`mb-5 p-3 rounded-xl text-sm font-medium text-center ${profileMsg.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"}`}>
                  {profileMsg.text}
                </div>
              )}

              {/* Content Body (View vs Edit) */}
              {!isEditingProfile ? (
                // VIEW MODE
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md">
                    <label className="text-xs font-semibold tracking-wider text-[#8c909f] uppercase mb-1 block">Full Name</label>
                    <p className="text-white font-medium text-lg">{userName}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md">
                    <label className="text-xs font-semibold tracking-wider text-[#8c909f] uppercase mb-1 block">Email Address</label>
                    <p className="text-white font-medium text-lg">{userEmail}</p>
                  </div>
                </div>
              ) : (
                // EDIT MODE
                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name} 
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} 
                      disabled={isUpdatingProfile} 
                      className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50" 
                      placeholder="Enter your full name" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={profileData.email} 
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} 
                      disabled={isUpdatingProfile} 
                      className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50" 
                      placeholder="Enter your email" 
                    />
                  </div>

                  {/* Password Change Option Checkbox / Toggle */}
                  <div className="pt-2 border-t border-white/10">
                    <label className="flex items-center gap-3 cursor-pointer py-1">
                      <input 
                        type="checkbox" 
                        checked={wantsToChangePassword} 
                        onChange={(e) => {
                          setWantsToChangePassword(e.target.checked);
                          if (!e.target.checked) setProfileData({ ...profileData, password: "" });
                        }} 
                        className="w-4 h-4 accent-red-600 rounded" 
                      />
                      <span className="text-sm font-medium text-white">Do you want to change your password?</span>
                    </label>

                    {wantsToChangePassword && (
                      <div className="mt-3 space-y-1.5 animate-fade-in">
                        <label className="text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">New Password</label>
                        <input 
                          type="password" 
                          value={profileData.password} 
                          onChange={(e) => setProfileData({ ...profileData, password: e.target.value })} 
                          disabled={isUpdatingProfile} 
                          placeholder="Enter new password" 
                          className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50" 
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button 
                      type="button" 
                      onClick={() => { setIsEditingProfile(false); setWantsToChangePassword(false); }}
                      disabled={isUpdatingProfile}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isUpdatingProfile} 
                      className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingProfile ? "Saving..." : "Save Details"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}