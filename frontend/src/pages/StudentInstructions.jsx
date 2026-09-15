// src/pages/StudentInstructions.jsx

import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function StudentInstructions() {
  const navigate = useNavigate();

  // -----------------------------
  // Profile States (Matching Dashboard)
  // -----------------------------
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "", email: "", registration_number: "", college_name: "",
    course_name: "", department: "", year_of_passing: "", contact: "", password: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  // Notifications and Dropdown states (Matching Dashboard top navigation)
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Accordion state for interactive student roadmap steps
  const [expandedCard, setExpandedCard] = useState("01");

  const getToken = () => sessionStorage.getItem("token");
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login", { replace: true }); // <--- Add { replace: true }
  };
  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "U");
  const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "User");

  const fetchUserData = async () => {
    const token = getToken();
    if (!token) return navigate("/login");
    try {
      const [userRes, eventsRes, regsRes] = await Promise.all([
        axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/my-registrations`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const user = userRes.data;
      setUserName(user.name || "User");
      setUserEmail(user.email || "");
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        registration_number: user.registration_number || "",
        college_name: user.college_name || "",
        course_name: user.course_name || "",
        department: user.department || "",
        year_of_passing: user.year_of_passing || "",
        contact: user.contact || "",
        password: "",
      });

      const allEvents = eventsRes.data;
      const myRegs = regsRes.data;
      const registeredEventIds = myRegs.map(reg => reg.event_id);
      
      const broadcastPromises = registeredEventIds.map(eventId =>
        axios.get(`${API_URL}/events/${eventId}/broadcasts`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.data.map(b => ({ ...b, eventTitle: allEvents.find(e => e.id === eventId)?.title || "Event" })))
        .catch(() => [])
      );

      const broadcastResults = await Promise.all(broadcastPromises);
      const allBroadcasts = broadcastResults.flat();
      allBroadcasts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotifications(allBroadcasts.filter(b => !b.is_read));

    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (broadcastId) => {
    try {
      const token = getToken();
      await axios.post(`${API_URL}/events/broadcasts/${broadcastId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== broadcastId));
    } catch (err) {
      console.error("Failed to mark broadcast as read");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg({ type: "", text: "" });

    try {
      const token = getToken();
      const payload = { ...profileData };
      if (!isChangingPassword) delete payload.password;

      const response = await axios.put(`${API_URL}/users/me`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedUser = response.data;
      if (updatedUser.access_token) {
        sessionStorage.setItem("token", updatedUser.access_token);
      }

      setUserName(updatedUser.name || profileData.name);
      setUserEmail(updatedUser.email || profileData.email);
      setProfileData(prev => ({ ...prev, ...updatedUser, password: "" }));

      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => {
        setIsEditingProfile(false);
        setIsChangingPassword(false);
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

  const studentWorkflowSteps = [
    {
      num: "01",
      title: "Complete Your Profile First",
      icon: "account_circle",
      accent: "from-blue-500 to-indigo-600",
      textColor: "text-blue-400",
      summary: "Ensure academic and contact details are fully updated to enable swift 1-click event registrations.",
      steps: [
        "Click on your profile avatar in the navigation bar to open your summary modal.",
        "Click 'Edit' and fill in your Registration Number, College Name, Course, Department, and Contact Number.",
        "Complete profiles are mandatory before registering for individual or team campus events."
      ]
    },
    {
      num: "02",
      title: "Discover & Register for Events",
      icon: "explore",
      accent: "from-teal-500 to-emerald-600",
      textColor: "text-teal-400",
      summary: "Browse upcoming workshops, hackathons, and seminars using advanced search and filters.",
      steps: [
        "Explore the 'Discover Events' grid on your main student dashboard.",
        "Use search queries or location/category filters to find events matching your interests.",
        "Click an event poster to review details, and click 'Confirm & Register'. Team events will prompt you to add your team members."
      ]
    },
    {
      num: "03",
      title: "Registered Event Hub & Discussions",
      icon: "forum",
      accent: "from-purple-500 to-violet-600",
      textColor: "text-purple-400",
      summary: "Interact with coordinators, view online meeting links, and post questions in public streams.",
      steps: [
        "Access your attending gatherings via the 'Registered Events' section on your dashboard.",
        "Clicking an event card opens the Registered Event Hub where meeting links and coordinator notices reside.",
        "Use the Q&A discussion stream to post public questions or check for official organizer replies."
      ]
    },
    {
      num: "04",
      title: "Managing Cancellations & Re-Registrations",
      icon: "event_repeat",
      accent: "from-orange-500 to-amber-600",
      textColor: "text-orange-400",
      summary: "Safely withdraw from events before deadlines or re-register if your schedule clears up.",
      steps: [
        "You can cancel your registration from the Registered Event Hub before the registration deadline passes.",
        "If you previously cancelled an event and decide to return, clicking register will prompt a 'Confirm Re-Registration' safeguard.",
        "Re-registering instantly updates your active participant status back to confirmed."
      ]
    }
  ];

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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; }
      `}</style>

      <div className="min-h-screen bg-[#0a0f1c] text-[#dae2fd]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="fixed inset-0 z-0 bg-grid pointer-events-none"></div>

        {/* NAVBAR (Matching exact top part structure from Dashboard) */}
        <nav className="sticky top-0 z-40 glass-nav px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 group cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate("/dashboard")}>
              <span className="material-symbols-outlined text-[36px] bg-clip-text text-transparent bg-gradient-to-br from-blue-500 to-purple-600">flare</span>
              <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-white ml-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Spotlight</span>
            </div>

            <div className="flex items-center gap-3 md:gap-4 relative">
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowNotificationsDropdown(prev => !prev)}
                  className="relative w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  title="Notifications"
                >
                  <span className="material-symbols-outlined text-xl">notifications</span>
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotificationsDropdown && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-modal rounded-2xl p-4 shadow-2xl z-50 animate-fade-in border border-white/15">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-orange-400 text-base">campaign</span>
                        Coordinator Updates
                      </h4>
                      <span className="text-[11px] text-[#8c909f] font-medium">{notifications.length} unread</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#8c909f]">
                          No new notifications right now.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2 transition-all hover:bg-white/10">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-orange-400 font-bold uppercase tracking-wider">{notif.eventTitle}</span>
                              <span className="text-[#8c909f]">{new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <p className="text-xs text-white leading-relaxed">{notif.message}</p>
                            <div className="flex justify-between items-center pt-1 border-t border-white/5">
                              <Link 
                                to={`/my-events/${notif.event_id}`} 
                                onClick={() => setShowNotificationsDropdown(false)}
                                className="text-[11px] text-blue-400 hover:underline font-semibold"
                              >
                                View Event
                              </Link>
                              <button 
                                onClick={() => handleMarkAsRead(notif.id)}
                                className="px-3 py-1 bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 text-orange-300 hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Mark as read
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Student Report Link Button */}
              <Link 
                to="/student-report" 
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 font-semibold hover:bg-blue-500/20 transition-all text-sm"
                title="View Activity Report"
              >
                <span className="material-symbols-outlined text-lg">bar_chart</span>
                <span className="hidden sm:inline">My Report</span>
              </Link>

              <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 px-3 py-2 md:pr-5 md:pl-2 rounded-full md:rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shadow-md">{getInitial(userName)}</div>
                <span className="hidden md:block text-sm tracking-wide">{userName}</span>
              </button>

              {/* Instruction 'i' Icon Button on right side of profile */}
              <Link 
                to="/student-instructions" 
                className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300"
                title="Student Instructions"
              >
                <span className="material-symbols-outlined text-xl">info</span>
              </Link>

              <button onClick={handleLogout} className="flex items-center justify-center w-10 h-10 md:w-auto md:px-4 md:py-2.5 rounded-full md:rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-lg">logout</span>
                <span className="hidden md:block ml-2 text-sm">Logout</span>
              </button>
            </div>
          </div>
        </nav>

        {/* MAIN BODY */}
        <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 space-y-10">

          <header className="space-y-3">
            <span className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-bold tracking-widest text-blue-400 uppercase">
              Student Guide
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Student Instructions & Roadmap
            </h1>
            <p className="text-[#8c909f] text-base md:text-lg">
              Learn how to set up your student profile, discover workshops, join event hubs, and manage team registrations.
            </p>
          </header>

          {/* INTERACTIVE ROADMAP ACCORDION CARDS */}
          <div className="space-y-4">
            {studentWorkflowSteps.map((item) => {
              const isOpen = expandedCard === item.num;
              return (
                <div 
                  key={item.num}
                  onClick={() => setExpandedCard(isOpen ? null : item.num)}
                  className={`glass-card rounded-3xl p-6 md:p-8 border transition-all cursor-pointer group ${isOpen ? 'border-blue-500/50 shadow-[0_10px_30px_rgba(59,130,246,0.15)] bg-[#101828]' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.accent} flex items-center justify-center text-white font-black text-base shadow-md flex-shrink-0`}>
                        {item.num}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-base ${item.textColor}`}>{item.icon}</span>
                          <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-blue-300 transition-colors">{item.title}</h3>
                        </div>
                        <p className="text-xs text-[#8c909f] mt-0.5">{item.summary}</p>
                      </div>
                    </div>
                    <div className={`w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-blue-500/20 text-blue-400' : ''}`}>
                      <span className="material-symbols-outlined">expand_more</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-3 animate-fade-in pl-2 md:pl-16">
                      <h4 className="text-xs font-bold text-[#8c909f] uppercase tracking-wider mb-2">How to Proceed:</h4>
                      <ul className="space-y-2.5">
                        {item.steps.map((stepText, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-[#dae2fd]">
                            <span className="material-symbols-outlined text-blue-400 text-base mt-0.5 flex-shrink-0">check_circle_outline</span>
                            <span className="leading-relaxed">{stepText}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </main>

        {/* PROFILE MODAL */}
        {showProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowProfile(false); }}>
            <div className="glass-modal w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 relative animate-slide-up custom-scrollbar">
              <div className="absolute top-5 right-5 flex items-center gap-2">
                {!isEditingProfile && (
                  <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all text-sm font-medium">
                    <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                  </button>
                )}
                <button onClick={() => setShowProfile(false)} disabled={isUpdatingProfile} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="text-center mb-8 mt-2">
                <div className="w-20 h-20 bg-blue-600 border border-white/10 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <span className="text-white text-3xl font-extrabold">{getInitial(userName)}</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Hi, {getFirstName(userName)}!</h2>
                <p className="text-[#8c909f] text-sm mt-1">
                  {isEditingProfile ? "Fill out your details to enable event registration" : "Review your profile details"}
                </p>
              </div>

              {profileMsg.text && (
                <div className={`mb-5 p-3 rounded-xl text-sm font-medium text-center ${profileMsg.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {profileMsg.text}
                </div>
              )}

              {!isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="glass-card p-4 rounded-xl"><label className="text-xs font-semibold text-[#8c909f] uppercase mb-1 block">Full Name</label><p className="text-white font-medium">{profileData.name || "Not set"}</p></div>
                    <div className="glass-card p-4 rounded-xl"><label className="text-xs font-semibold text-[#8c909f] uppercase mb-1 block">Email Address</label><p className="text-white font-medium">{profileData.email || "Not set"}</p></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="glass-card p-4 rounded-xl"><label className="text-xs font-semibold text-[#8c909f] uppercase mb-1 block">Registration Number</label><p className="text-white font-medium">{profileData.registration_number || "Not set"}</p></div>
                    <div className="glass-card p-4 rounded-xl"><label className="text-xs font-semibold text-[#8c909f] uppercase mb-1 block">College Name</label><p className="text-white font-medium">{profileData.college_name || "Not set"}</p></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="glass-card p-4 rounded-xl"><label className="text-xs font-semibold text-[#8c909f] uppercase mb-1 block">Course Name</label><p className="text-white font-medium">{profileData.course_name || "Not set"}</p></div>
                    <div className="glass-card p-4 rounded-xl"><label className="text-xs font-semibold text-[#8c909f] uppercase mb-1 block">Department</label><p className="text-white font-medium">{profileData.department || "Not set"}</p></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="glass-card p-4 rounded-xl"><label className="text-xs font-semibold text-[#8c909f] uppercase mb-1 block">Year of Passing</label><p className="text-white font-medium">{profileData.year_of_passing || "Not set"}</p></div>
                    <div className="glass-card p-4 rounded-xl"><label className="text-xs font-semibold text-[#8c909f] uppercase mb-1 block">Contact Number</label><p className="text-white font-medium">{profileData.contact || "Not set"}</p></div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Full Name *</label>
                      <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Email Address *</label>
                      <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Registration Number *</label>
                      <input type="text" value={profileData.registration_number} onChange={(e) => setProfileData({ ...profileData, registration_number: e.target.value })} required placeholder="e.g. REG2026012" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">College Name *</label>
                      <input type="text" value={profileData.college_name} onChange={(e) => setProfileData({ ...profileData, college_name: e.target.value })} required placeholder="e.g. SCMS" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Course Name *</label>
                      <input type="text" value={profileData.course_name} onChange={(e) => setProfileData({ ...profileData, course_name: e.target.value })} required placeholder="e.g. MCA" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Department *</label>
                      <input type="text" value={profileData.department} onChange={(e) => setProfileData({ ...profileData, department: e.target.value })} required placeholder="e.g. Computer Applications" className="mt-1 w-full bg-[#1e293b]/50 border border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Year of Passing *</label>
                      <input type="text" value={profileData.year_of_passing} onChange={(e) => setProfileData({ ...profileData, year_of_passing: e.target.value })} required placeholder="e.g. 2026" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Contact Number *</label>
                      <input type="text" value={profileData.contact} onChange={(e) => setProfileData({ ...profileData, contact: e.target.value })} required placeholder="e.g. +91 9876543210" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 mt-4">
                    <label className="flex items-center gap-3 cursor-pointer py-2">
                      <input type="checkbox" checked={isChangingPassword} onChange={(e) => setIsChangingPassword(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
                      <span className="text-sm font-medium text-white">Change Password</span>
                    </label>

                    {isChangingPassword && (
                      <div className="mt-3 animate-fade-in">
                        <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">New Password *</label>
                        <input type="password" value={profileData.password} onChange={(e) => setProfileData({ ...profileData, password: e.target.value })} required={isChangingPassword} placeholder="Enter new password" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => { setIsEditingProfile(false); setIsChangingPassword(false); }} disabled={isUpdatingProfile} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all">Cancel</button>
                    <button type="submit" disabled={isUpdatingProfile} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">{isUpdatingProfile ? "Saving..." : "Save Details"}</button>
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