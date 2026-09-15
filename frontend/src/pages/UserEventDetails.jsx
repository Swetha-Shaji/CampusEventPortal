// src/pages/UserEventDetails.jsx

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function UserEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // -----------------------------
  // Profile & Notification States (Matching Dashboard)
  // -----------------------------
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    registration_number: "",
    college_name: "",
    course_name: "",
    department: "",
    year_of_passing: "",
    contact: "",
    password: "",
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regMsg, setRegMsg] = useState({ type: "", text: "" });
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [hasPreviouslyCancelled, setHasPreviouslyCancelled] = useState(false);

  const [teamLeader, setTeamLeader] = useState("");
  const [numMembers, setNumMembers] = useState(1);
  const [memberNames, setMemberNames] = useState([""]);

  const getToken = () => sessionStorage.getItem("token");
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login", { replace: true }); // <--- Add { replace: true }
  };
  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "U");
  const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "User");

  const fetchUserDataAndEvent = async () => {
    const token = getToken();
    if (!token) return navigate("/login");
    try {
      setLoading(true);
      
      const [userRes, eventsRes, regsRes, allRegsAdminRes] = await Promise.all([
        axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/my-registrations`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/participants`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
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
      setIsChangingPassword(false);
      setTeamLeader(user.name || "");

      const allEvents = eventsRes.data || [];
      const foundEvent = allEvents.find(e => e.id === parseInt(id));
      if (!foundEvent) throw new Error("Event not found");
      setEvent(foundEvent);

      const alreadyRegistered = regsRes.data.some(reg => reg.event_id === parseInt(id) && reg.status === "registered");
      setIsRegistered(alreadyRegistered);

      // Gather general notifications for top navbar
      const myRegs = regsRes.data || [];
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

      // Check if user has a cancelled record for this event in backend data
      const userCancelledRecord = allRegsAdminRes.data.some(
        r => r.user_id === user.id && r.event_id === parseInt(id) && r.reg_status === "Cancelled"
      );
      setHasPreviouslyCancelled(userCancelledRecord);

      if (foundEvent.event_format === "team") {
        const initialCount = foundEvent.min_team_size - 1 > 0 ? foundEvent.min_team_size - 1 : 1;
        setNumMembers(initialCount);
        setMemberNames(Array(initialCount).fill(""));
      }
    } catch (err) {
      setError("Failed to load event details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDataAndEvent();
  }, [id, navigate]);

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

  const isProfileComplete = () => {
    return (
      profileData.name &&
      profileData.email &&
      profileData.registration_number &&
      profileData.college_name &&
      profileData.course_name &&
      profileData.department &&
      profileData.year_of_passing &&
      profileData.contact
    );
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "TBD";
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleNumMembersChange = (e) => {
    const val = parseInt(e.target.value) || 1;
    setNumMembers(val);
    setMemberNames(prev => {
      const updated = [...prev];
      if (val > updated.length) {
        return [...updated, ...Array(val - updated.length).fill("")];
      } else {
        return updated.slice(0, val);
      }
    });
  };

  const handleMemberNameChange = (index, value) => {
    const updated = [...memberNames];
    updated[index] = value;
    setMemberNames(updated);
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return navigate("/login");

    if (!isProfileComplete()) {
      setRegMsg({ 
        type: "incomplete_profile", 
        text: "Please complete your profile details before registering for events." 
      });
      return;
    }

    if (event.event_format === "team") {
      if (!teamLeader.trim()) {
        setRegMsg({ type: "error", text: "Team leader name is required." });
        return;
      }

      const totalTeamSize = 1 + memberNames.length;
      if (totalTeamSize < event.min_team_size || totalTeamSize > event.max_team_size) {
        setRegMsg({ 
          type: "error", 
          text: `Total team size must be between ${event.min_team_size} and ${event.max_team_size}.` 
        });
        return;
      }

      for (let i = 0; i < memberNames.length; i++) {
        if (!memberNames[i].trim()) {
          setRegMsg({ type: "error", text: `Please provide a name for Member #${i + 1}` });
          return;
        }
      }
    }

    setShowRegisterModal(true);
  };

  const confirmRegister = async () => {
    setShowRegisterModal(false);
    const token = getToken();
    if (!token) return navigate("/login");

    let payload = {};
    if (event.event_format === "team") {
      payload = {
        team_leader: teamLeader.trim(),
        team_members: memberNames.map(m => m.trim())
      };
    }

    setRegistering(true);
    setRegMsg({ type: "", text: "" });

    try {
      await axios.post(`${API_URL}/events/${event.id}/register`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setIsRegistered(true);
      setHasPreviouslyCancelled(false);
      setRegMsg({ type: "success", text: "Successfully registered for this event!" });
    } catch (err) {
      setRegMsg({ type: "error", text: err.response?.data?.detail || "Failed to register." });
    } finally {
      setRegistering(false);
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

      const response = await axios.put(`${API_URL}/users/me`, payload, { headers: { Authorization: `Bearer ${token}` } });
      const updated = response.data;
      if (updated.access_token) {
        sessionStorage.setItem("token", updated.access_token);
      }

      setUserName(updated.name || profileData.name);
      setUserEmail(updated.email || profileData.email);
      setProfileData(prev => ({ ...prev, ...updated, password: "" }));

      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => { 
        setIsEditingProfile(false); 
        setIsChangingPassword(false);
        setProfileMsg({ type: "", text: "" }); 
        setShowProfile(false); 
      }, 1200);
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.detail || "Failed to update profile." });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-nav { background: rgba(10, 15, 28, 0.7); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .glass-card { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2); }
        .glass-modal { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .glass-dropdown { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.5); }
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
        
        {/* NAVBAR (Matching Dashboard exact top structure) */}
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
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-dropdown rounded-2xl p-4 shadow-2xl z-50 animate-fade-in border border-white/15">
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
                              <span className="text-[#8c909f]">
                              {new Date(notif.created_at.replace(" ", "T").endsWith("Z") ? notif.created_at.replace(" ", "T") : `${notif.created_at.replace(" ", "T")}Z`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
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

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          

          {loading ? (
            <div className="text-center py-20 text-blue-400 animate-pulse text-xl font-bold">Loading Event...</div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center font-medium">{error}</div>
          ) : event && (
            <div className="flex flex-col lg:flex-row gap-10">
              
              <div className="w-full lg:w-[40%] flex-shrink-0 animate-slide-up">
                <div className="glass-card rounded-3xl overflow-hidden shadow-[0_15px_40px_rgba(59,130,246,0.15)] aspect-[2/3] sticky top-32">
                  {event.banner_url ? (
                    <img src={`${API_URL}${event.banner_url}`} alt={event.title} className="w-full h-full object-cover object-center" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-[#8c909f] text-2xl font-bold p-6 text-center">{event.title}</div>
                  )}
                  <div className="absolute top-4 right-4 bg-blue-600/90 backdrop-blur-md px-4 py-1.5 text-sm font-bold rounded-full text-white capitalize shadow-lg border border-blue-400/30">
                    {event.category || "General"}
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-[60%] flex flex-col gap-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <div className="glass-card p-8 md:p-10 rounded-3xl">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>{event.title}</h1>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-8 pb-8 border-b border-white/10">
                    <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                      <span className="material-symbols-outlined text-blue-400">calendar_today</span>
                      <span className="font-medium">
                        {formatDateDisplay(event.date_from)} {event.date_to ? `to ${formatDateDisplay(event.date_to)}` : ''}
                      </span>
                    </div>
                    {event.registration_deadline && (
                      <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <span className="material-symbols-outlined text-yellow-400">event_busy</span>
                        <span className="font-medium">Reg Deadline: {formatDateDisplay(event.registration_deadline)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                      <span className="material-symbols-outlined text-green-400">{event.event_format === 'team' ? 'groups' : 'person'}</span>
                      <span className="font-medium capitalize">
                        {event.event_format === 'team' ? `Team Event (${event.min_team_size}-${event.max_team_size} members)` : 'Individual Event'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-400">description</span> About the Event
                      </h3>
                      <p className="text-[#8c909f] leading-relaxed whitespace-pre-line text-[15px]">{event.description}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8 rounded-3xl flex flex-col gap-5">
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {event.event_format === "team" ? "Team Registration" : "Individual Registration"}
                  </h3>

                  {regMsg.text && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${regMsg.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/30 text-center" : regMsg.type === "incomplete_profile" ? "bg-amber-500/10 text-amber-300 border border-amber-500/30 flex flex-col gap-2" : "bg-red-500/10 text-red-400 border border-red-500/30 text-center"}`}>
                      <span>{regMsg.text}</span>
                      {regMsg.type === "incomplete_profile" && (
                        <button 
                          onClick={() => { setShowProfile(true); setIsEditingProfile(true); }}
                          className="mt-1 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-xl font-semibold text-xs transition-all w-max flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit_note</span> Complete Profile Page Now
                        </button>
                      )}
                    </div>
                  )}

                  {isRegistered ? (
                    <div className="w-full py-4 bg-green-500/20 border border-green-500/40 text-green-400 font-bold rounded-xl text-center flex items-center justify-center gap-2 text-lg shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                      <span className="material-symbols-outlined text-2xl">check_circle</span>
                      <span>Registered</span>
                    </div>
                  ) : (
                    <form onSubmit={handleRegisterClick} className="space-y-4">
                      {event.event_format === "team" && (
                        <>
                          <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl text-xs text-blue-300">
                            Team size required: <strong>{event.min_team_size} to {event.max_team_size}</strong> members total (Team Leader counts as 1).
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Team Leader Name *</label>
                            <input type="text" value={teamLeader} onChange={(e) => setTeamLeader(e.target.value)} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl transition-all outline-none" />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Number of Additional Members *</label>
                            <input type="number" min="1" max={event.max_team_size - 1} value={numMembers} onChange={handleNumMembersChange} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl transition-all outline-none" />
                          </div>

                          <div className="space-y-3 pt-2">
                            <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1 block">Additional Member Names *</label>
                            {memberNames.map((member, idx) => (
                              <div key={idx} className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={member} 
                                  onChange={(e) => handleMemberNameChange(idx, e.target.value)} 
                                  required 
                                  placeholder={`Member #${idx + 1} Full Name`} 
                                  className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-2.5 rounded-xl transition-all text-sm outline-none" 
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <button 
                        type="submit" 
                        disabled={registering} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 text-lg mt-2 cursor-pointer"
                      >
                        {registering ? "Processing Registration..." : "Confirm & Register for Event"}
                      </button>
                    </form>
                  )}
                </div>
              </div>

            </div>
          )}
        </main>

        {/* PROFILE MODAL */}
        {showProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowProfile(false); }}>
            <div className="glass-modal w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 relative animate-slide-up custom-scrollbar">
              <div className="absolute top-5 right-5 flex items-center gap-2">
                {!isEditingProfile && (
                  <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all text-sm font-medium cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                  </button>
                )}
                <button onClick={() => setShowProfile(false)} disabled={isUpdatingProfile} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer">
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
                      <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Email Address *</label>
                      <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Registration Number *</label>
                      <input type="text" value={profileData.registration_number} onChange={(e) => setProfileData({ ...profileData, registration_number: e.target.value })} required placeholder="e.g. REG2026012" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">College Name *</label>
                      <input type="text" value={profileData.college_name} onChange={(e) => setProfileData({ ...profileData, college_name: e.target.value })} required placeholder="e.g. SCMS" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Course Name *</label>
                      <input type="text" value={profileData.course_name} onChange={(e) => setProfileData({ ...profileData, course_name: e.target.value })} required placeholder="e.g. MCA" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Department *</label>
                      <input type="text" value={profileData.department} onChange={(e) => setProfileData({ ...profileData, department: e.target.value })} required placeholder="e.g. Computer Applications" className="mt-1 w-full bg-[#1e293b]/50 border border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Year of Passing *</label>
                      <input type="text" value={profileData.year_of_passing} onChange={(e) => setProfileData({ ...profileData, year_of_passing: e.target.value })} required placeholder="e.g. 2026" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Contact Number *</label>
                      <input type="text" value={profileData.contact} onChange={(e) => setProfileData({ ...profileData, contact: e.target.value })} required placeholder="e.g. +91 9876543210" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
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
                        <input type="password" value={profileData.password} onChange={(e) => setProfileData({ ...profileData, password: e.target.value })} required={isChangingPassword} placeholder="Enter new password" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => { setIsEditingProfile(false); setIsChangingPassword(false); }} disabled={isUpdatingProfile} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all cursor-pointer">Cancel</button>
                    <button type="submit" disabled={isUpdatingProfile} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer">{isUpdatingProfile ? "Saving..." : "Save Details"}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Registration Confirmation Modal Popup */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-dropdown w-full max-w-md rounded-3xl p-6 relative animate-fade-in space-y-4 text-center border border-white/15 shadow-2xl">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/30">
                <span className="material-symbols-outlined text-2xl">help</span>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {hasPreviouslyCancelled ? "Confirm Re-Registration" : "Confirm Registration"}
                </h3>
                <p className="text-sm text-[#8c909f] leading-relaxed">
                  {hasPreviouslyCancelled ? (
                    <>Are you sure you wanted to re register for the event <span className="text-white font-semibold">{event?.title}</span>? You may not be able to register again if registration closes.</>
                  ) : (
                    <>Are you sure you wanted to register for <span className="text-white font-semibold">{event?.title}</span>?</>
                  )}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmRegister}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
                >
                  {hasPreviouslyCancelled ? "Yes, Re-Register" : "Yes, Register"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}