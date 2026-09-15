// src/pages/EventRecords.jsx

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function EventRecords() {
  const navigate = useNavigate();

  // -----------------------------
  // Profile States (Matching AdminDashboard)
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

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationTypeFilter, setLocationTypeFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [dateSort, setDateSort] = useState("none"); // "nearest" | "furthest" | "none"
  const [registrationSort, setRegistrationSort] = useState("none"); // "high_to_low" | "low_to_high" | "none"

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [selectedPoster, setSelectedPoster] = useState(null);

  // Participant Modal States
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");

  const getToken = () => sessionStorage.getItem("token");

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/admin-login", { replace: true });
  };

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

  const fetchEventRecords = async () => {
    const token = getToken();
    if (!token) return navigate("/admin-login");
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/event-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data || []);
    } catch (err) {
      setError("Failed to load event records.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenParticipantsModal = async (eventObj) => {
    setSelectedEventForParticipants(eventObj);
    setLoadingParticipants(true);
    setParticipantSearch("");
    const token = getToken();
    try {
      const res = await axios.get(`${API_URL}/admin/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const eventParticipants = (res.data || []).filter(
        p => p.event_id === eventObj.id || p.event_title === eventObj.title
      );
      setParticipants(eventParticipants);
    } catch (err) {
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchEventRecords();
  }, [navigate]);

  // Reset pagination to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, locationTypeFilter, formatFilter, dateSort, registrationSort]);

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

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!name || !nameRegex.test(name)) {
      setProfileMsg({ type: "error", text: "Full name must only include letters and spaces." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setProfileMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }

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

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "TBD";
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Unified global search across title, location name, org name, and general details
  const filteredEvents = events
    .filter(ev => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !q ||
        ev.title?.toLowerCase().includes(q) ||
        ev.location?.toLowerCase().includes(q) ||
        ev.organization_name?.toLowerCase().includes(q) ||
        ev.category?.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || ev.status === statusFilter;
      const matchesLocationType = locationTypeFilter === "all" || ev.location_type === locationTypeFilter;
      const matchesFormat = formatFilter === "all" || ev.event_format === formatFilter;

      return matchesSearch && matchesStatus && matchesLocationType && matchesFormat;
    })
    .sort((a, b) => {
      // Date Sorting
      if (dateSort === "nearest") {
        return new Date(a.date_from || 0) - new Date(b.date_from || 0);
      }
      if (dateSort === "furthest") {
        return new Date(b.date_from || 0) - new Date(a.date_from || 0);
      }

      // Registration Sorting
      if (registrationSort === "high_to_low") {
        return b.registered_count - a.registered_count;
      }
      if (registrationSort === "low_to_high") {
        return a.registered_count - b.registered_count;
      }

      return 0;
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  const filteredParticipantsList = participants.filter(p => {
    const q = participantSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.registration_number?.toLowerCase().includes(q) ||
      p.college_name?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
    );
  });

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

        {/* NAVBAR (Matching AdminDashboard) */}
        <nav className="sticky top-0 z-40 glass-nav px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            
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
            
            <div className="flex items-center gap-3 md:gap-4 relative z-10">
              
              <button onClick={handleOpenProfile} className="flex items-center gap-3 px-3 py-2 md:pr-5 md:pl-2 rounded-full md:rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 hover:border-red-500/50 transition-all duration-300">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center text-sm font-bold shadow-md">
                  {getInitial(userName)}
                </div>
                <span className="hidden md:block text-sm tracking-wide">
                  {userName}
                </span>
              </button>

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

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div>
              <Link to="/manage-events" className="inline-flex items-center gap-2 text-[#8c909f] hover:text-white transition-colors group mb-3 w-max">
                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                <span className="font-semibold text-sm">Back to Manage Events</span>
              </Link>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Event Records</h1>
              <p className="text-[#8c909f] text-sm mt-1">Review all event details, view posters, and track participant registration counts.</p>
            </div>
          </div>

          {/* ADVANCED FILTER & SEARCH CONTROLS */}
          <div className="glass-card p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#8c909f]">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input 
                type="text"
                placeholder="Search title, location, org..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              />
            </div>

            <div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="all">Status: All Statuses</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <select 
                value={locationTypeFilter}
                onChange={(e) => setLocationTypeFilter(e.target.value)}
                className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="all">Location: All Types</option>
                <option value="offline">Offline</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div>
              <select 
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="all">Format: All Formats</option>
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>

            <div>
              <select 
                value={dateSort}
                onChange={(e) => {
                  setDateSort(e.target.value);
                  if(e.target.value !== "none") setRegistrationSort("none");
                }}
                className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="none">Date Sort: Default</option>
                <option value="nearest">Nearest First</option>
                <option value="furthest">Furthest First</option>
              </select>
            </div>

            <div>
              <select 
                value={registrationSort}
                onChange={(e) => {
                  setRegistrationSort(e.target.value);
                  if(e.target.value !== "none") setDateSort("none");
                }}
                className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="none">Registrations: Default</option>
                <option value="high_to_low">High to Low</option>
                <option value="low_to_high">Low to High</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center font-medium">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-20 text-red-400 animate-pulse text-lg font-bold">Loading event records...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border-dashed border-2 border-white/10">
              <span className="material-symbols-outlined text-5xl text-[#8c909f] mb-2">event_busy</span>
              <p className="text-white font-semibold">No event records found matching criteria.</p>
            </div>
          ) : (
            <>
              {/* Event Records Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentEvents.map((ev) => {
                  const badgeColor = 
                    ev.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                    ev.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                    ev.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    'bg-amber-500/20 text-amber-400 border-amber-500/30';

                  return (
                    <div key={ev.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4 border border-white/10">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase rounded-full">
                            {ev.category}
                          </span>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${badgeColor}`}>
                            {ev.status}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>{ev.title}</h3>
                        <p className="text-xs text-[#8c909f] line-clamp-2">{ev.description || "No description provided."}</p>

                        <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs text-[#dae2fd]">
                          <div className="flex justify-between">
                            <span className="text-[#8c909f]">Date:</span>
                            <span className="font-medium">{formatDateDisplay(ev.date_from)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8c909f]">Deadline:</span>
                            <span className="font-medium">{formatDateDisplay(ev.registration_deadline)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#8c909f]">Location:</span>
                            <span className="font-medium capitalize">{ev.location_type === 'online' ? 'Online' : ev.location || 'TBD'}</span>
                          </div>
                          {ev.organization_name && (
                            <div className="flex justify-between">
                              <span className="text-[#8c909f]">Organization:</span>
                              <span className="font-medium">{ev.organization_name}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-[#8c909f]">Format:</span>
                            <span className="font-medium capitalize">{ev.event_format}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button 
                          onClick={() => handleOpenParticipantsModal(ev)}
                          className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer group w-full sm:w-auto justify-center"
                          title="View Registered List"
                        >
                          <span className="material-symbols-outlined text-blue-400 text-[16px] group-hover:scale-110 transition-transform">group</span>
                          <span className="text-xs font-bold text-blue-300">{ev.registered_count} Registered</span>
                        </button>

                        {ev.banner_url ? (
                          <button 
                            onClick={() => setSelectedPoster(`${API_URL}${ev.banner_url}`)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span> View Poster
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#8c909f] italic">No Poster</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
                  <p className="text-xs text-[#8c909f]">
                    Showing <span className="text-white font-medium">{startIndex + 1}</span> to <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, filteredEvents.length)}</span> of <span className="text-white font-medium">{filteredEvents.length}</span> event records
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span> Previous
                    </button>

                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                              currentPage === pageNumber
                                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                : "bg-white/5 text-[#8c909f] hover:bg-white/10 hover:text-white border border-white/10"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      Next <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* MODAL: VIEW REGISTERED STUDENTS LIST */}
        {selectedEventForParticipants && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedEventForParticipants(null)}>
            <div className="glass-modal max-w-4xl w-full p-6 sm:p-8 rounded-3xl relative animate-slide-up space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Registered Students: {selectedEventForParticipants.title}
                  </h3>
                  <p className="text-xs text-[#8c909f] mt-1">List of all participants registered for this event.</p>
                </div>
                <button onClick={() => setSelectedEventForParticipants(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex-shrink-0 cursor-pointer">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#8c909f]">
                    <span className="material-symbols-outlined text-lg">search</span>
                  </span>
                  <input 
                    type="text"
                    placeholder="Search participant by name, email, college..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {loadingParticipants ? (
                <div className="text-center py-12 text-blue-400 animate-pulse font-semibold">Loading participants list...</div>
              ) : filteredParticipantsList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-[#8c909f]">
                  No students registered for this event yet.
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-[#8c909f] text-[11px] uppercase tracking-wider">
                          <th className="p-3.5 font-semibold">Student Name</th>
                          <th className="p-3.5 font-semibold">Reg No</th>
                          <th className="p-3.5 font-semibold">College</th>
                          <th className="p-3.5 font-semibold">Department</th>
                          <th className="p-3.5 font-semibold">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {filteredParticipantsList.map((p, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-3.5 font-medium text-white">{p.name}<span className="block text-[10px] text-[#8c909f]">{p.email}</span></td>
                            <td className="p-3.5 text-[#dae2fd]">{p.registration_number || "N/A"}</td>
                            <td className="p-3.5 text-[#dae2fd]">{p.college_name || "N/A"}</td>
                            <td className="p-3.5 text-[#dae2fd]">{p.department || "N/A"}</td>
                            <td className="p-3.5 text-[#dae2fd]">{p.contact || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: POSTER PREVIEW */}
        {selectedPoster && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setSelectedPoster(null)}>
            <div className="glass-modal max-w-2xl w-full p-6 rounded-3xl relative animate-slide-up flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedPoster(null)} className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
              
              <h3 className="text-lg font-bold text-white mb-4 self-start">Event Poster Preview</h3>
              
              <div className="w-full rounded-2xl overflow-hidden border border-white/15 bg-black/60 flex items-center justify-center p-2 shadow-2xl">
                <img 
                  src={selectedPoster} 
                  alt="Event Poster" 
                  className="w-full h-auto max-h-[75vh] object-contain rounded-xl shadow-md" 
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================= */}
        {/* PROFILE MODAL */}
        {/* ============================= */}
        {showProfile && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) handleCloseProfile(); }}>
            <div className="glass-modal w-full max-w-md rounded-3xl p-8 relative animate-slide-up">
              
              <div className="absolute top-5 right-5 flex items-center gap-2">
                {!isEditingProfile && (
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all text-sm font-medium shadow-sm hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                  </button>
                )}
                <button 
                  onClick={handleCloseProfile} 
                  disabled={isUpdatingProfile} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

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

              {profileMsg.text && (
                <div className={`mb-5 p-3 rounded-xl text-sm font-medium text-center ${profileMsg.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"}`}>
                  {profileMsg.text}
                </div>
              )}

              {!isEditingProfile ? (
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
                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider text-[#8c909f] uppercase ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name} 
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} 
                      disabled={isUpdatingProfile} 
                      className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50 outline-none" 
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
                      className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50 outline-none" 
                      placeholder="Enter your email" 
                    />
                  </div>

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
                          className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50 outline-none" 
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button 
                      type="button" 
                      onClick={() => { setIsEditingProfile(false); setWantsToChangePassword(false); }}
                      disabled={isUpdatingProfile}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isUpdatingProfile} 
                      className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] disabled:opacity-50 cursor-pointer"
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