// src/pages/RegisteredEventHub.jsx

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

const STATUS_COLORS = {
  Registered: "#4ade80",
  registered: "#4ade80",
  Cancelled: "#ffb4ab",
  cancelled: "#ffb4ab",
  Active: "#adc6ff",
  active: "#adc6ff",
  Ended: "#8c909f",
  ended: "#8c909f"
};

export default function RegisteredEventHub() {
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
    name: "", email: "", registration_number: "", college_name: "",
    course_name: "", department: "", year_of_passing: "", contact: "", password: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [userId, setUserId] = useState(null);

  const [broadcasts, setBroadcasts] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const getToken = () => sessionStorage.getItem("token");
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login", { replace: true }); // <--- Add { replace: true }
  };
  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "U");
  const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "User");

  const fetchHubData = async () => {
    const token = getToken();
    if (!token) return navigate("/login");

    try {
      setLoading(true);
      const [userRes, eventsRes, commentsRes, broadcastsRes, regsRes] = await Promise.all([
        axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/events/${id}/comments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/events/${id}/broadcasts`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/my-registrations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      setUserName(userRes.data.name || "User");
      setUserEmail(userRes.data.email || "");
      setUserId(userRes.data.id);
      setProfileData({
        name: userRes.data.name || "",
        email: userRes.data.email || "",
        registration_number: userRes.data.registration_number || "",
        college_name: userRes.data.college_name || "",
        course_name: userRes.data.course_name || "",
        department: userRes.data.department || "",
        year_of_passing: userRes.data.year_of_passing || "",
        contact: userRes.data.contact || "",
        password: "",
      });
      
      const allEvents = eventsRes.data || [];
      const foundEvent = allEvents.find(e => e.id === parseInt(id));
      if (!foundEvent) throw new Error("Event not found");
      setEvent(foundEvent);
      
      setComments(commentsRes.data || []);
      setBroadcasts(broadcastsRes.data || []);

      // Gather general user notifications across registered events
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

      for (const c of commentsRes.data) {
        if (c.user_id === userRes.data.id && c.admin_reply && !c.is_read_by_student) {
          await axios.post(`${API_URL}/events/comments/${c.id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        }
      }

    } catch (err) {
      setError("Failed to load registered event hub.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
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

  const handleGlobalMarkAsRead = async (broadcastId) => {
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

  const handlePostComment = async (e) => {
    e.preventDefault();
    setCommentError("");

    if (!newCommentText.trim()) {
      setCommentError("Message cannot be empty.");
      return;
    }
    if (newCommentText.length > 500) {
      setCommentError("Message must not exceed 500 characters.");
      return;
    }

    try {
      const token = getToken();
      const res = await axios.post(`${API_URL}/events/${id}/comments`, {
        message: newCommentText.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });

      setComments(prev => [...prev, res.data]);
      setNewCommentText("");
    } catch (err) {
      alert("Failed to post message.");
    }
  };

  const markAsRead = async (broadcastId) => {
    try {
      const token = getToken();
      await axios.post(`${API_URL}/events/broadcasts/${broadcastId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBroadcasts(prev => prev.map(b => b.id === broadcastId ? { ...b, is_read: true } : b));
    } catch (err) {
      console.error("Failed to mark broadcast as read");
    }
  };

  const handleCancelRegistration = () => {
    setShowCancelModal(true);
  };

  const confirmCancelRegistration = async () => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/events/${id}/cancel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCancelModal(false);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel event registration.");
      setShowCancelModal(false);
    }
  };

  const unreadCount = broadcasts.filter(b => !b.is_read).length;

  const isEventEnded = (event) => {
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (event.date_to) {
      const endDateOnly = new Date(new Date(event.date_to).getFullYear(), new Date(event.date_to).getMonth(), new Date(event.date_to).getDate());
      return endDateOnly < nowDateOnly;
    }
    if (event.date_from) {
      const startDateOnly = new Date(new Date(event.date_from).getFullYear(), new Date(event.date_from).getMonth(), new Date(event.date_from).getDate());
      return startDateOnly < nowDateOnly;
    }
    return false;
  };

  const canCancelRegistration = (deadlineString) => {
    if (!deadlineString) return true;
    const now = new Date();
    const deadline = new Date(deadlineString);
    return now < deadline;
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "TBD";
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCommentTime = (dateString) => {
  if (!dateString) return "Recently";
  
  // Clean the string and force UTC timezone recognition
  const formattedStr = dateString.replace(" ", "T");
  const safeDateString = formattedStr.endsWith('Z') ? formattedStr : `${formattedStr}Z`;
  const date = new Date(safeDateString);
  
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (isToday) return `Today at ${timeString}`;
  if (isYesterday) return `Yesterday at ${timeString}`;

  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

  const ended = event ? isEventEnded(event) : false;
  const isCancelled = event ? event.status === 'cancelled' : false;
  const showCancelButton = event ? canCancelRegistration(event.registration_deadline) : false;

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-nav { background: rgba(10, 15, 28, 0.7); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .glass-card { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2); }
        .glass-dropdown { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.5); }
        .bg-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
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
                                onClick={() => handleGlobalMarkAsRead(notif.id)}
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

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-10">
          <div className="flex justify-end items-center">
            {!ended && !isCancelled && showCancelButton && (
              <button 
                onClick={handleCancelRegistration}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span> Cancel Registration
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-20 text-blue-400 animate-pulse text-xl font-bold">Loading Event Hub...</div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center font-medium">{error}</div>
          ) : event && (
            <div className="space-y-10 animate-fade-in">
              
              <div className="flex flex-col lg:flex-row gap-10 items-start">
                
                <div className="w-full lg:w-[40%] flex-shrink-0">
                  <div className={`glass-card rounded-3xl overflow-hidden shadow-2xl aspect-[2/3] border relative ${ended ? 'border-gray-500/30' : 'border-green-500/30'}`}>
                    {event.banner_url ? (
                      <img src={`${API_URL}${event.banner_url}`} alt={event.title} className={`w-full h-full object-cover object-center ${ended ? 'grayscale opacity-60' : ''}`} />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-[#8c909f] text-2xl font-bold p-6 text-center">{event.title}</div>
                    )}

                    {ended ? (
                      <div className="absolute top-4 left-4 bg-gray-700/90 backdrop-blur-md px-4 py-1.5 text-xs font-bold rounded-full text-gray-300 shadow-lg border border-gray-500/30 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">event_busy</span> Event Ended
                      </div>
                    ) : (
                      <div className="absolute top-4 left-4 bg-green-600/90 backdrop-blur-md px-4 py-1.5 text-xs font-bold rounded-full text-white shadow-lg border border-green-400/30 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Registration Confirmed
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full lg:w-[60%] glass-card p-8 md:p-10 rounded-3xl space-y-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3" style={{ fontFamily: "'Manrope', sans-serif" }}>{event.title}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-sm">
                        <span className="material-symbols-outlined text-blue-400 text-[18px]">calendar_today</span>
                        <span>
                          {formatDateDisplay(event.date_from)} {event.date_to ? `to ${formatDateDisplay(event.date_to)}` : ''}
                        </span>
                      </div>
                      {event.registration_deadline && (
                        <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-sm">
                          <span className="material-symbols-outlined text-yellow-400 text-[18px]">event_busy</span>
                          <span>Reg Deadline: {formatDateDisplay(event.registration_deadline)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-sm">
                        <span className="material-symbols-outlined text-green-400 text-[18px]">person</span>
                        <span className="capitalize">{event.event_format === 'team' ? `Team Event (${event.min_team_size}-${event.max_team_size} members)` : 'Individual Event'}</span>
                      </div>
                      {event.organization_name && (
                        <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-sm">
                          <span className="material-symbols-outlined text-purple-400 text-[18px]">domain</span>
                          <span>{event.organization_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[#8c909f] mb-2">Description</h3>
                    <p className="text-[#8c909f] leading-relaxed whitespace-pre-line text-sm">{event.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[#8c909f] mb-1">Location Details</h3>
                      <div className="flex items-center gap-2 text-[#dae2fd] text-sm">
                        <span className="material-symbols-outlined text-blue-400 text-[18px]">
                          {event.location_type === "online" ? "language" : "location_on"}
                        </span>
                        <span>{event.location_type === "online" ? "Online Meeting" : event.location}</span>
                      </div>
                    </div>

                    {event.contact && (
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[#8c909f] mb-1">Contact Point</h3>
                        <div className="flex items-center gap-2 text-[#dae2fd] text-sm">
                          <span className="material-symbols-outlined text-green-400 text-[18px]">support_agent</span>
                          <span>{event.contact}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {event.meet_url && !ended && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-sm">Online Meeting Link</p>
                        <p className="text-xs text-[#8c909f]">Join session directly via platform link</p>
                      </div>
                      <a href={event.meet_url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all">
                        Join Meeting
                      </a>
                    </div>
                  )}
                </div>

              </div>

              {/* BROADCASTS SECTION */}
              <div className="glass-card p-8 md:p-10 rounded-3xl space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Coordinator Broadcasts</h3>
                    <p className="text-[#8c909f] text-sm">Official announcements and notices sent by the event coordinator.</p>
                  </div>
                  <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold rounded-full">
                    {broadcasts.length} total
                  </span>
                </div>

                <div className="space-y-3">
                  {broadcasts.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl text-[#8c909f] text-xs">
                      No broadcast notices posted yet.
                    </div>
                  ) : (
                    broadcasts.map((b) => (
                      <div 
                        key={b.id} 
                        onClick={() => markAsRead(b.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${b.is_read ? 'bg-white/5 border-white/5 opacity-70' : 'bg-orange-600/10 border-orange-500/30 shadow-md'}`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">campaign</span> Coordinator Notice
                          </span>
                          <span className="text-[11px] text-[#8c909f]">{formatCommentTime(b.created_at)}</span>
                        </div>
                        <p className="text-xs md:text-sm text-white leading-relaxed">{b.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Q&A SECTION */}
              <div className="glass-card p-8 md:p-10 rounded-3xl space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Event Q&A & Discussion Stream</h3>
                  <p className="text-[#8c909f] text-sm">Ask public questions to organizers and read answers shared with other registered candidates.</p>
                </div>

                {!ended && !isCancelled && (
                  <form onSubmit={handlePostComment} className="space-y-3">
                    {commentError && (
                      <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-xs font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>{commentError}</span>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Ask a question or share a thought publicly..." 
                        value={newCommentText}
                        onChange={(e) => {
                          setNewCommentText(e.target.value);
                          if (commentError) setCommentError("");
                        }}
                        className="flex-1 bg-[#1e293b]/50 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:border-blue-500 outline-none"
                      />
                      <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg transition-all cursor-pointer">
                        Post Message
                      </button>
                    </div>
                    <div className="flex justify-end text-[11px] text-[#8c909f] px-1">
                      <span className={newCommentText.length > 500 ? "text-orange-400 font-bold" : ""}>
                        {newCommentText.length}/500 characters
                      </span>
                    </div>
                  </form>
                )}

                <div className="space-y-4 pt-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                      <span className="material-symbols-outlined text-4xl text-[#8c909f] mb-2">chat_bubble_outline</span>
                      <p className="text-sm text-[#8c909f]">No discussions yet.</p>
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{c.user_name || c.userName}</span>
                            {c.role === 'admin' ? (
                              <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase rounded-md">Organizer / Admin</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold rounded-md">Participant</span>
                            )}
                          </div>
                          <span className="text-xs text-[#8c909f]">Sent: {formatCommentTime(c.created_at || c.createdAt)}</span>
                        </div>

                        <p className="text-sm text-[#dae2fd]">{c.message}</p>

                        {(c.admin_reply || c.adminReply) && (
                          <div className="bg-red-600/10 border border-red-500/30 p-4 rounded-xl ml-6 mt-2 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wide block">Event Coordinator</span>
                              <span className="text-[11px] text-red-300/80">Replied: {formatCommentTime(c.admin_replied_at || c.adminRepliedAt)}</span>
                            </div>
                            <p className="text-sm text-white">{c.admin_reply || c.adminReply}</p>
                          </div>
                        )}
                      </div>
                    ))
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
                      <input type="text" value={profileData.contact} onChange={(e) => setProfileData({ ...profileData, contact: e.target.value })} required placeholder="e.g. +91 9876543210" className="mt-1 w-full bg-[#1e293b]/50 border border-blue-500 text-white px-4 py-3 rounded-xl" />
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

        {/* Custom Confirmation Modal Popup with exact warning text */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-dropdown w-full max-w-md rounded-3xl p-6 relative animate-fade-in space-y-4 text-center border border-white/15 shadow-2xl">
              <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>Cancel Registration</h3>
                <p className="text-sm text-[#8c909f] leading-relaxed">
                  Are you sure you wanted to cancel your registration for <span className="text-white font-semibold">{event?.title}</span>? You may not be able to register again if registration closes.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all text-sm cursor-pointer"
                >
                  No, Keep It
                </button>
                <button 
                  onClick={confirmCancelRegistration}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(220,38,38,0.3)] cursor-pointer"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}