// src/pages/Dashboard.jsx

import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function Dashboard() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [unreadCounts, setUnreadCounts] = useState({});

  const [registeredFilter, setRegisteredFilter] = useState("all");
  const [registeredSearchQuery, setRegisteredSearchQuery] = useState("");
  const [registeredSortBy, setRegisteredSortBy] = useState("upcoming_first");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocationType, setFilterLocationType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("upcoming_first");

  // Pagination & Hover States
  const [currentRegisteredPage, setCurrentRegisteredPage] = useState(1);
  const registeredItemsPerPage = 4;
  const [hoveredRegEventId, setHoveredRegEventId] = useState(null);

  const [currentDiscoverPage, setCurrentDiscoverPage] = useState(1);
  const discoverItemsPerPage = 4;
  const [hoveredDiscEventId, setHoveredDiscEventId] = useState(null);

  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
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

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const getToken = () => sessionStorage.getItem("token");

  const fetchData = async () => {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        setLoading(true);
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
        setEvents(allEvents);
        setMyRegistrations(myRegs);

        const registeredEventIds = myRegs.map(reg => reg.event_id);
        const broadcastPromises = registeredEventIds.map(eventId =>
          axios.get(`${API_URL}/events/${eventId}/broadcasts`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.data.map(b => ({ ...b, eventTitle: allEvents.find(e => e.id === eventId)?.title || "Event" })))
          .catch(() => [])
        );

        const counts = {};
        for (const eventId of registeredEventIds) {
          try {
            const res = await axios.get(`${API_URL}/events/${eventId}/comments`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const unread = (res.data || []).filter(
              c => c.user_id === user.id && c.admin_reply && !c.is_read_by_student
            ).length;
            counts[eventId] = unread;
          } catch (err) {
            counts[eventId] = 0;
          }
        }
        setUnreadCounts(counts);

        const broadcastResults = await Promise.all(broadcastPromises);
        const allBroadcasts = broadcastResults.flat();
        allBroadcasts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setNotifications(allBroadcasts.filter(b => !b.is_read));

      } catch (err) {
        if (err.response?.status === 401) {
          handleLogout();
          return;
        }
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchData();
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

  const handleOpenProfile = async () => {
    setProfileMsg({ type: "", text: "" });
    setShowProfile(true);
    setIsEditingProfile(false);
    await fetchData();
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });

    const { name, email, registration_number, college_name, course_name, department, year_of_passing, contact, password } = profileData;
    if (!name || !email || !registration_number || !college_name || !course_name || !department || !year_of_passing || !contact || (isChangingPassword && !password)) {
      setProfileMsg({ type: "error", text: "All fields are required to save details." });
      return;
    }

    const regNumRegex = /^[A-Za-z0-9]+$/;
    if (!regNumRegex.test(registration_number)) {
      setProfileMsg({ type: "error", text: "Registration number should only contain letters and numbers (no special characters)." });
      return;
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) {
      setProfileMsg({ type: "error", text: "Full name should only include letters and spaces (no numbers or special characters)." });
      return;
    }

    const textOnlyRegex = /^[A-Za-z\s]+$/;
    if (!textOnlyRegex.test(college_name)) {
      setProfileMsg({ type: "error", text: "College name should only accept characters." });
      return;
    }
    if (!textOnlyRegex.test(course_name)) {
      setProfileMsg({ type: "error", text: "Course name should only accept characters." });
      return;
    }
    if (!textOnlyRegex.test(department)) {
      setProfileMsg({ type: "error", text: "Department should only accept characters." });
      return;
    }

    const contactRegex = /^\d{10}$/;
    if (!contactRegex.test(contact)) {
      setProfileMsg({ type: "error", text: "Contact number must be exactly 10 digits." });
      return;
    }

    const yearRegex = /^\d{4}$/;
    if (!yearRegex.test(year_of_passing)) {
      setProfileMsg({ type: "error", text: "Year of passing must be a valid 4-digit year." });
      return;
    }
    const currentYear = new Date().getFullYear();
    if (parseInt(year_of_passing, 10) < currentYear) {
      setProfileMsg({ type: "error", text: `Year of passing must not be below the current year (${currentYear}).` });
      return;
    }

    if (isChangingPassword) {
      if (password.length < 6) {
        setProfileMsg({ type: "error", text: "Password must at least contain 6 characters" });
        return;
      }
      if (password.length > 64) {
        setProfileMsg({ type: "error", text: "Password must be only 64 characters long" });
        return;
      }
      if (/\s/.test(password)) {
        setProfileMsg({ type: "error", text: "Password must not contain spaces" });
        return;
      }
      if (!/[A-Za-z]/.test(password)) {
        setProfileMsg({ type: "error", text: "Password must include at least one letter" });
        return;
      }
      if (!/\d/.test(password)) {
        setProfileMsg({ type: "error", text: "Password must include at least one number" });
        return;
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        setProfileMsg({ type: "error", text: "Password must include at least one special character" });
        return;
      }
    }

    setIsUpdatingProfile(true);

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

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "U");
  const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "User");

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

  const getDaysLeftAlert = (dateFrom, dateTo) => {
    if (!dateFrom) return null;
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDate = new Date(dateFrom);
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    const endDate = dateTo ? new Date(dateTo) : startDate;
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    if (nowDateOnly >= startDateOnly && nowDateOnly <= endDateOnly) {
      return "Event Ongoing";
    }

    const diffTime = startDateOnly - nowDateOnly;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Starts Tomorrow";
    } else if (diffDays > 1 && diffDays <= 7) {
      return `${diffDays} days left`;
    }
    return null;
  };

  const isRegistrationClosingSoon = (deadlineString) => {
    if (!deadlineString) return false;
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const deadline = new Date(deadlineString);
    const deadlineDateOnly = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

    const diffTime = deadlineDateOnly - nowDateOnly;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 7;
  };

  // -----------------------------
  // Filter & Sort: Registered Events
  // -----------------------------
  const registeredEventIds = myRegistrations.map(reg => reg.event_id);
  const filteredAndSortedRegisteredEvents = events
    .filter(event => registeredEventIds.includes(event.id))
    .filter(event => {
      const ended = isEventEnded(event);
      const isCancelled = event.status === "cancelled";

      if (registeredFilter === "active") return !ended && !isCancelled;
      if (registeredFilter === "ended") return ended && !isCancelled;
      if (registeredFilter === "cancelled") return isCancelled;
      return true;
    })
    .filter(event => {
      const query = registeredSearchQuery.toLowerCase();
      return !query || event.title?.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const aEnded = isEventEnded(a);
      const bEnded = isEventEnded(b);
      const aCancelled = a.status === 'cancelled';
      const bCancelled = b.status === 'cancelled';

      const getRank = (isEnded, isCancelled) => {
        if (isCancelled) return 2;
        if (isEnded) return 3;
        return 1; // Active
      };

      const rankA = getRank(aEnded, aCancelled);
      const rankB = getRank(bEnded, bCancelled);

      if (rankA !== rankB) {
        return rankA - rankB; 
      }

      if (registeredSortBy === "upcoming_first") {
        return new Date(a.date_from) - new Date(b.date_from);
      } else if (registeredSortBy === "later_first") {
        return new Date(b.date_from) - new Date(a.date_from);
      }
      return b.id - a.id;
    });

  // Pagination bounds for Registered Events
  const totalRegisteredPages = Math.ceil(filteredAndSortedRegisteredEvents.length / registeredItemsPerPage);
  const indexLastRegEvent = currentRegisteredPage * registeredItemsPerPage;
  const indexFirstRegEvent = indexLastRegEvent - registeredItemsPerPage;
  const currentRegisteredEvents = filteredAndSortedRegisteredEvents.slice(indexFirstRegEvent, indexLastRegEvent);

  useEffect(() => {
    if (currentRegisteredPage > totalRegisteredPages && totalRegisteredPages > 0) {
      setCurrentRegisteredPage(1);
    }
  }, [filteredAndSortedRegisteredEvents.length, currentRegisteredPage, totalRegisteredPages]);


  // -----------------------------
  // Filter & Sort: Discover Events
  // -----------------------------
  const currentDate = new Date();
  const filteredAndSortedDiscoverEvents = events
    .filter(event => !registeredEventIds.includes(event.id))
    .filter(event => event.status === "active")
    .filter(event => {
      if (event.registration_deadline) {
        const deadlineDate = new Date(event.registration_deadline);
        if (deadlineDate < currentDate) {
          return false;
        }
      }

      const query = searchQuery.toLowerCase();
      const titleMatch = event.title?.toLowerCase().includes(query);
      const locationMatch = event.location?.toLowerCase().includes(query) || (event.location_type === "online" && "online".includes(query));
      const orgMatch = event.organization_name?.toLowerCase().includes(query);
      const categoryMatch = event.category?.toLowerCase().includes(query);

      const matchesSearch = !searchQuery || titleMatch || locationMatch || orgMatch || categoryMatch;
      const matchesLocationType = filterLocationType === "all" || event.location_type === filterLocationType;
      const matchesCategory = filterCategory === "all" || event.category === filterCategory;

      return matchesSearch && matchesLocationType && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "upcoming_first") {
        return new Date(a.date_from) - new Date(b.date_from);
      } else if (sortBy === "later_first") {
        return new Date(b.date_from) - new Date(a.date_from);
      }
      return b.id - a.id;
    });

  // Pagination bounds for Discover Events
  const totalDiscoverPages = Math.ceil(filteredAndSortedDiscoverEvents.length / discoverItemsPerPage);
  const indexLastDiscEvent = currentDiscoverPage * discoverItemsPerPage;
  const indexFirstDiscEvent = indexLastDiscEvent - discoverItemsPerPage;
  const currentDiscoverEvents = filteredAndSortedDiscoverEvents.slice(indexFirstDiscEvent, indexLastDiscEvent);

  useEffect(() => {
    if (currentDiscoverPage > totalDiscoverPages && totalDiscoverPages > 0) {
      setCurrentDiscoverPage(1);
    }
  }, [filteredAndSortedDiscoverEvents.length, currentDiscoverPage, totalDiscoverPages]);


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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen bg-[#0a0f1c] text-[#dae2fd]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="fixed inset-0 z-0 bg-grid pointer-events-none"></div>

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

              <button onClick={handleOpenProfile} className="flex items-center gap-3 px-3 py-2 md:pr-5 md:pl-2 rounded-full md:rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all cursor-pointer">
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

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-16">
          
          {/* ==================================================== */}
          {/* REGISTERED EVENTS SECTION */}
          {/* ==================================================== */}
          {(myRegistrations.length > 0 || registeredFilter !== "all") && (
            <section className="space-y-6">
              <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>Registered Events</h2>
                  <p className="text-[#8c909f] text-sm">Events you are attending. Click a banner to view details, ask questions, and chat publicly.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#8c909f]">
                      <span className="material-symbols-outlined text-lg">search</span>
                    </span>
                    <input 
                      type="text"
                      placeholder="Search event..."
                      value={registeredSearchQuery}
                      onChange={(e) => { setRegisteredSearchQuery(e.target.value); setCurrentRegisteredPage(1); }}
                      className="w-full sm:w-52 bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white pl-10 pr-4 py-2 rounded-xl text-sm outline-none transition-all"
                    />
                  </div>

                  <select 
                    value={registeredFilter}
                    onChange={(e) => { setRegisteredFilter(e.target.value); setCurrentRegisteredPage(1); }}
                    className="bg-[#1e293b] border border-white/10 focus:border-blue-500 text-white px-4 py-2 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="all">All Registered</option>
                    <option value="active">Active Events Only</option>
                    <option value="ended">Ended Events Only</option>
                    <option value="cancelled">Cancelled Events Only</option>
                  </select>

                  <select 
                    value={registeredSortBy}
                    onChange={(e) => { setRegisteredSortBy(e.target.value); setCurrentRegisteredPage(1); }}
                    className="bg-[#1e293b] border border-white/10 focus:border-blue-500 text-white px-4 py-2 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="upcoming_first">Upcoming First</option>
                    <option value="later_first">Later First</option>
                  </select>
                </div>
              </header>

              {filteredAndSortedRegisteredEvents.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center border-dashed border-2 border-white/10">
                  <p className="text-sm text-[#8c909f]">No registered events match your search or filter criteria.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="relative flex items-center w-full">
                    {/* Left Arrow Button */}
                    {totalRegisteredPages > 1 && (
                      <button
                        onClick={() => setCurrentRegisteredPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentRegisteredPage === 1}
                        className="absolute -left-6 sm:-left-12 z-30 text-white/40 hover:text-white transition-all duration-300 disabled:opacity-10 disabled:cursor-not-allowed cursor-pointer bg-transparent outline-none border-none flex items-center justify-center"
                        title="Previous Events"
                      >
                        <span className="material-symbols-outlined text-4xl sm:text-6xl drop-shadow-xl">chevron_left</span>
                      </button>
                    )}

                    {/* Registered Events Grid Container */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start">
                      {currentRegisteredEvents.map((event) => {
                        const unreadReplies = unreadCounts[event.id] || 0;
                        const ended = isEventEnded(event);
                        const isCancelled = event.status === 'cancelled';
                        const daysAlert = !ended && !isCancelled ? getDaysLeftAlert(event.date_from, event.date_to) : null;

                        return (
                          <Link 
                            key={event.id} 
                            to={`/my-events/${event.id}`} 
                            onMouseEnter={() => setHoveredRegEventId(event.id)}
                            onMouseLeave={() => setHoveredRegEventId(null)}
                            className={`relative rounded-2xl overflow-hidden group cursor-pointer aspect-[2/3] shadow-lg border transition-all duration-300 hover:-translate-y-2 bg-[#050810] ${isCancelled ? 'border-red-500/50' : ended ? 'border-gray-500/30 hover:border-gray-400' : 'border-green-500/30 hover:border-green-500'}`}
                          >
                            {!ended && !isCancelled && unreadReplies > 0 && (
                              <div className="absolute top-3 left-3 z-20 bg-red-600 text-white text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-white/25" title="New reply from coordinator">
                                {unreadReplies}
                              </div>
                            )}

                            {event.banner_url ? (
                              <img src={`${API_URL}${event.banner_url}`} alt={event.title} className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ${ended || isCancelled ? 'grayscale opacity-60' : ''}`} />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-[#8c909f] p-4 text-center">{event.title}</div>
                            )}

                            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-20">
                              {isCancelled ? (
                                <div className="bg-red-600/90 backdrop-blur-md px-3 py-1 text-xs font-bold rounded-full text-white shadow-lg border border-red-400/30 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">cancel</span> Event Cancelled
                                </div>
                              ) : ended ? (
                                <div className="bg-gray-700/90 backdrop-blur-md px-3 py-1 text-xs font-bold rounded-full text-gray-300 shadow-lg border border-gray-500/30 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">event_busy</span> Event Ended
                                </div>
                              ) : (
                                <>
                                  <div className="bg-green-600/90 backdrop-blur-md px-3 py-1 text-xs font-bold rounded-full text-white shadow-lg border border-green-400/30 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Registered
                                  </div>
                                  {daysAlert && (
                                    <div className="bg-emerald-950/90 backdrop-blur-md px-3 py-1 text-xs font-bold rounded-full text-emerald-400 shadow-lg border border-emerald-600/40">
                                      {daysAlert}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                              <p className="text-white font-bold truncate w-full text-lg mb-1">{event.title}</p>
                              <span className={`text-xs font-semibold ${isCancelled ? 'text-red-400' : ended ? 'text-gray-400' : 'text-green-400'}`}>Open Discussion Hub →</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Right Arrow Button */}
                    {totalRegisteredPages > 1 && (
                      <button
                        onClick={() => setCurrentRegisteredPage(prev => Math.min(prev + 1, totalRegisteredPages))}
                        disabled={currentRegisteredPage === totalRegisteredPages}
                        className="absolute -right-6 sm:-right-12 z-30 text-white/40 hover:text-white transition-all duration-300 disabled:opacity-10 disabled:cursor-not-allowed cursor-pointer bg-transparent outline-none border-none flex items-center justify-center"
                        title="Next Events"
                      >
                        <span className="material-symbols-outlined text-4xl sm:text-6xl drop-shadow-xl">chevron_right</span>
                      </button>
                    )}
                  </div>

                  {/* Registered Events Pagination Dots (Only for Current Set) */}
                  {currentRegisteredEvents.length > 0 && (
                    <div className="flex justify-center items-center gap-2 mt-6 flex-wrap px-4">
                      {currentRegisteredEvents.map((event) => {
                        const isHovered = hoveredRegEventId === event.id;
                        return (
                          <div
                            key={event.id}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              isHovered 
                                ? "bg-white scale-125" 
                                : "bg-gray-500"
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ==================================================== */}
          {/* DISCOVER EVENTS SECTION */}
          {/* ==================================================== */}
          <section className="space-y-6">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>Discover Events</h2>
                <p className="text-[#8c909f] text-sm">Register for the latest workshops, seminars, and exclusive campus gatherings.</p>
              </div>
            </header>

            <div className="glass-card p-4 md:p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#8c909f]">
                  <span className="material-symbols-outlined text-lg">search</span>
                </span>
                <input 
                  type="text"
                  placeholder="Search by name, location, org..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentDiscoverPage(1); }}
                  className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                />
              </div>

              <div>
                <select 
                  value={filterLocationType}
                  onChange={(e) => { setFilterLocationType(e.target.value); setCurrentDiscoverPage(1); }}
                  className="w-full bg-[#1e293b] border border-white/10 focus:border-blue-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="all">All Locations (Online & Offline)</option>
                  <option value="offline">Offline Only</option>
                  <option value="online">Online Only</option>
                </select>
              </div>

              <div>
                <select 
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setCurrentDiscoverPage(1); }}
                  className="w-full bg-[#1e293b] border border-white/10 focus:border-blue-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="all">All Categories</option>
                  <option value="conference">Conference</option>
                  <option value="courses">Courses</option>
                  <option value="hackathons">Hackathons</option>
                  <option value="jobfair">Job Fair</option>
                  <option value="internship">Internship</option>
                  <option value="workshop">Workshop</option>
                  <option value="collegefest">College Fest</option>
                  <option value="others">Others</option>
                </select>
              </div>

              <div>
                <select 
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentDiscoverPage(1); }}
                  className="w-full bg-[#1e293b] border border-white/10 focus:border-blue-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="upcoming_first">Upcoming First</option>
                  <option value="later_first">Later First</option>
                </select>
              </div>
            </div>

            {filteredAndSortedDiscoverEvents.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border-dashed border-2 border-white/10 flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-[#8c909f] mb-2">search_off</span>
                <p className="text-base text-white font-semibold mb-1">No events found</p>
                <p className="text-xs text-[#8c909f]">Try adjusting your search query or filter options.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="relative flex items-center w-full">
                  {/* Left Arrow Button */}
                  {totalDiscoverPages > 1 && (
                    <button
                      onClick={() => setCurrentDiscoverPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentDiscoverPage === 1}
                      className="absolute -left-6 sm:-left-12 z-30 text-white/40 hover:text-white transition-all duration-300 disabled:opacity-10 disabled:cursor-not-allowed cursor-pointer bg-transparent outline-none border-none flex items-center justify-center"
                      title="Previous Events"
                    >
                      <span className="material-symbols-outlined text-4xl sm:text-6xl drop-shadow-xl">chevron_left</span>
                    </button>
                  )}

                  {/* Discover Events Grid Container */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start">
                    {currentDiscoverEvents.map((event) => {
                      const closingSoon = isRegistrationClosingSoon(event.registration_deadline);

                      return (
                        <Link 
                          key={event.id} 
                          to={`/events/${event.id}`} 
                          onMouseEnter={() => setHoveredDiscEventId(event.id)}
                          onMouseLeave={() => setHoveredDiscEventId(null)}
                          className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[2/3] shadow-lg border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2 bg-[#050810]"
                        >
                          {event.banner_url ? (
                            <img src={`${API_URL}${event.banner_url}`} alt={event.title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-[#8c909f] p-4 text-center">{event.title}</div>
                          )}
                          
                          {event.organization_name && (
                            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 text-[11px] font-bold rounded-full text-purple-300 border border-purple-500/30 truncate max-w-[80%]">
                              {event.organization_name}
                            </div>
                          )}

                          {closingSoon && (
                            <div className="absolute top-3 right-3 bg-red-600/90 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold rounded-full text-white shadow-lg border border-red-400/40">
                              Registration closes soon
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                            <p className="text-white font-bold truncate w-full text-lg mb-1">{event.title}</p>
                            <div className="flex items-center justify-between text-xs text-[#8c909f]">
                              <span className="capitalize">{event.location_type === 'offline' ? event.location : 'Online'}</span>
                              <span className="text-blue-400 font-semibold">View Details →</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Right Arrow Button */}
                  {totalDiscoverPages > 1 && (
                    <button
                      onClick={() => setCurrentDiscoverPage(prev => Math.min(prev + 1, totalDiscoverPages))}
                      disabled={currentDiscoverPage === totalDiscoverPages}
                      className="absolute -right-6 sm:-right-12 z-30 text-white/40 hover:text-white transition-all duration-300 disabled:opacity-10 disabled:cursor-not-allowed cursor-pointer bg-transparent outline-none border-none flex items-center justify-center"
                      title="Next Events"
                    >
                      <span className="material-symbols-outlined text-4xl sm:text-6xl drop-shadow-xl">chevron_right</span>
                    </button>
                  )}
                </div>

                {/* Discover Events Pagination Dots (Only for Current Set) */}
                {currentDiscoverEvents.length > 0 && (
                  <div className="flex justify-center items-center gap-2 mt-6 flex-wrap px-4">
                    {currentDiscoverEvents.map((event) => {
                      const isHovered = hoveredDiscEventId === event.id;
                      return (
                        <div
                          key={event.id}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            isHovered 
                              ? "bg-white scale-125" 
                              : "bg-gray-500"
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

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
                      <input type="text" value={profileData.year_of_passing} onChange={(e) => setProfileData({ ...profileData, year_of_passing: e.target.value })} required placeholder="e.g. passing year" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Contact Number *</label>
                      <input type="text" value={profileData.contact} onChange={(e) => setProfileData({ ...profileData, contact: e.target.value })} required placeholder="e.g. contact number" className="mt-1 w-full bg-[#1e293b]/50 border border-blue-500 text-white px-4 py-3 rounded-xl" />
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