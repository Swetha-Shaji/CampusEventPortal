// src/pages/ManageUsers.jsx

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function ManageUsers() {
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

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); 
  const [participants, setParticipants] = useState([]);
  const [statusFilter, setStatusFilter] = useState("registered");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  // -----------------------------
  // Pagination States (Participants)
  // -----------------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); 

  // -----------------------------
  // Pagination States (Event Posters)
  // -----------------------------
  const [currentEventPage, setCurrentEventPage] = useState(1);
  const [eventsPerPage] = useState(8); // Display 8 event posters per page

  const getToken = () => sessionStorage.getItem("token");

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/admin-login", { replace: true });
  };

  const fetchUserProfile = async () => {
    const token = getToken();
    if (!token) {
      navigate("/admin-login", { replace: true });
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

  const fetchEvents = async () => {
    const token = getToken();
    if (!token) return navigate("/admin-login", { replace: true });
    try {
      const response = await axios.get(`${API_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out events whose status is draft or scheduled
      const validEvents = (response.data || []).filter(
        ev => ev.status !== "draft" && ev.status !== "scheduled"
      );
      setEvents(validEvents);
    } catch (err) {
      console.error("Failed to load events");
    }
  };

  const fetchParticipantsData = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/admin/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParticipants(response.data || []);
    } catch (err) {
      console.error("Failed to load participants");
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchEvents();
    fetchParticipantsData();
  }, [navigate]);

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

  const getParticipantCountForEvent = (eventId, eventTitle) => {
    return participants.filter(p => (p.event_id === eventId || p.event_title === eventTitle) && p.reg_status === "Registered").length;
  };

  const filteredParticipants = participants.filter(p => {
    if (selectedEvent && p.event_id !== selectedEvent.id && p.event_title !== selectedEvent.title) {
      return false;
    }

    if (statusFilter === "registered" && p.reg_status !== "Registered") return false;
    if (statusFilter === "cancelled" && p.reg_status !== "Cancelled") return false;

    const query = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.registration_number?.toLowerCase().includes(query) ||
      p.college_name?.toLowerCase().includes(query) ||
      p.department?.toLowerCase().includes(query) ||
      p.year_of_passing?.toLowerCase().includes(query)
    );
  });

  // -----------------------------
  // Pagination Calculations (Participants)
  // -----------------------------
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentParticipants = filteredParticipants.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredParticipants.length, currentPage, totalPages]);

  // -----------------------------
  // Pagination Calculations (Event Posters)
  // -----------------------------
  const totalEventPages = Math.ceil(events.length / eventsPerPage);
  const indexOfLastEvent = currentEventPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);

  useEffect(() => {
    if (currentEventPage > totalEventPages && totalEventPages > 0) {
      setCurrentEventPage(1);
    }
  }, [events.length, currentEventPage, totalEventPages]);


  const handleExportCSV = () => {
    if (!selectedEvent) return;
    
    // Export should still use all filtered participants, not just the current page
    if (filteredParticipants.length === 0) {
      alert("No participants match the current filter criteria to export.");
      return;
    }

    const headers = ["Name", "Email", "Registration Number", "College Name", "Course", "Department", "Year of Passing", "Contact", "Status"];
    const rows = filteredParticipants.map(p => [
      `"${p.name || ""}"`,
      `"${p.email || ""}"`,
      `"${p.registration_number || ""}"`,
      `"${p.college_name || ""}"`,
      `"${p.course_name || ""}"`,
      `"${p.department || ""}"`,
      `"${p.year_of_passing || ""}"`,
      `"${p.contact || ""}"`,
      `"${p.reg_status || "Registered"}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedEvent.title.replace(/\s+/g, '_')}_participants_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen bg-[#0a0f1c] text-[#dae2fd]" style={{ fontFamily: "'Inter', sans-serif" }}>
        
        {/* Background Grids & Glows */}
        <div className="fixed inset-0 z-0 bg-grid pointer-events-none"></div>
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] -left-10 w-[500px] h-[500px] bg-red-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>
          <div className="absolute top-[20%] -right-20 w-[600px] h-[600px] bg-orange-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>
        </div>

        {/* NAVBAR */}
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

        {/* MAIN BODY */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
          
          <div className="animate-fade-in space-y-6">
            
            {!selectedEvent ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Select an Event Poster</h1>
                    <p className="text-[#8c909f] text-sm mt-1">Click on any event poster below to view active registrations and cancelled candidate histories.</p>
                  </div>
                </div>

                {events.length === 0 ? (
                  <div className="glass-card rounded-2xl p-12 text-center border-dashed border-2 border-white/10">
                    <span className="material-symbols-outlined text-6xl text-red-400/50 mb-4">event_busy</span>
                    <h3 className="text-2xl font-bold text-white mb-2">No active or published events found</h3>
                    <p className="text-[#8c909f]">Draft and scheduled events are hidden from management views.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start">
                      {currentEvents.map((event) => {
                        const count = getParticipantCountForEvent(event.id, event.title);
                        return (
                          <div 
                            key={event.id} 
                            onClick={() => { setSelectedEvent(event); setCurrentPage(1); }}
                            className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[2/3] shadow-lg border border-white/10 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-2 bg-[#050810]"
                          >
                            {event.banner_url ? (
                              <img src={`${API_URL}${event.banner_url}`} alt={event.title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-[#8c909f] p-4 text-center">{event.title} <br/>(No Image)</div>
                            )}
                            
                            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-bold rounded-full text-white shadow-lg border border-white/10 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-red-400 text-[14px]">group</span>
                              <span>{count} Registered</span>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                              <p className="text-white font-bold truncate w-full text-lg mb-1">{event.title}</p>
                              <span className="text-xs text-red-400 font-semibold">Click to view participants & cancellations →</span>
                            </div>

                            {event.category && (
                              <div className="absolute top-3 right-3 bg-red-600/90 backdrop-blur-md px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md text-white shadow-lg border border-red-400/30">
                                {event.category}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* EVENT POSTERS PAGINATION CONTROLS */}
                    {totalEventPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
                        <p className="text-xs text-[#8c909f]">
                          Showing <span className="font-bold text-white">{indexOfFirstEvent + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastEvent, events.length)}</span> of <span className="font-bold text-white">{events.length}</span> events
                        </p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setCurrentEventPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentEventPage === 1}
                            className="p-2 rounded-xl bg-[#1e293b] border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                          </button>
                          
                          <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
                            {Array.from({ length: totalEventPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentEventPage(page)}
                                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  currentEventPage === page 
                                    ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.4)]' 
                                    : 'bg-transparent text-[#8c909f] hover:text-white hover:bg-white/10 border border-transparent'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button 
                            onClick={() => setCurrentEventPage(prev => Math.min(prev + 1, totalEventPages))}
                            disabled={currentEventPage === totalEventPages}
                            className="p-2 rounded-xl bg-[#1e293b] border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <button onClick={() => { setSelectedEvent(null); setStatusFilter("registered"); setCurrentPage(1); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 mb-2 transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Event Posters
                    </button>
                    <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Participants for: {selectedEvent.title}</h1>
                    <p className="text-[#8c909f] text-sm mt-1">Review active and cancelled candidates, filter records, and export reports.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                      className="bg-[#1e293b] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:border-red-500 outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="registered">Registered Only</option>
                      <option value="cancelled">Cancelled Only</option>
                    </select>

                    <div className="w-full sm:w-56">
                      <input 
                        type="text" 
                        placeholder="Filter by name, college..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-[#1e293b]/50 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:border-red-500 outline-none"
                      />
                    </div>
                    
                    <button 
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-[#8c909f] text-xs uppercase tracking-wider">
                          <th className="p-4 font-semibold">Student Name</th>
                          <th className="p-4 font-semibold">Reg No</th>
                          <th className="p-4 font-semibold">College</th>
                          <th className="p-4 font-semibold">Department</th>
                          <th className="p-4 font-semibold text-center">Status</th>
                          <th className="p-4 font-semibold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {currentParticipants.length === 0 ? (
                          <tr><td colSpan="6" className="p-8 text-center text-[#8c909f]">No candidate records found matching criteria.</td></tr>
                        ) : (
                          currentParticipants.map((p, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 font-medium text-white">{p.name}<span className="block text-xs text-[#8c909f]">{p.email}</span></td>
                              <td className="p-4 text-[#dae2fd]">{p.registration_number || "N/A"}</td>
                              <td className="p-4 text-[#dae2fd]">{p.college_name || "N/A"}</td>
                              <td className="p-4 text-[#dae2fd]">{p.department || "N/A"}</td>
                              <td className="p-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${p.reg_status === 'Registered' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                  {p.reg_status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button onClick={() => setSelectedParticipant(p)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                                  Full Profile
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PARTICIPANT PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
                    <p className="text-xs text-[#8c909f]">
                      Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, filteredParticipants.length)}</span> of <span className="font-bold text-white">{filteredParticipants.length}</span> participants
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl bg-[#1e293b] border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      
                      <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentPage === page 
                                ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.4)]' 
                                : 'bg-transparent text-[#8c909f] hover:text-white hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl bg-[#1e293b] border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </main>

        {/* MODAL: VIEW FULL PARTICIPANT PROFILE */}
        {selectedParticipant && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedParticipant(null); }}>
            <div className="glass-modal w-full max-w-lg rounded-3xl p-8 relative animate-slide-up">
              <button onClick={() => setSelectedParticipant(null)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/70 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {getInitial(selectedParticipant.name)}
                </div>
                <h3 className="text-xl font-bold text-white">{selectedParticipant.name}</h3>
                <p className="text-[#8c909f] text-sm">{selectedParticipant.email}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-full">
                    Event: {selectedParticipant.event_title}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedParticipant.reg_status === 'Registered' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                    Status: {selectedParticipant.reg_status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between"><span className="text-[#8c909f]">Registration No:</span> <span className="font-medium text-white">{selectedParticipant.registration_number || "N/A"}</span></div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between"><span className="text-[#8c909f]">College Name:</span> <span className="font-medium text-white">{selectedParticipant.college_name || "N/A"}</span></div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between"><span className="text-[#8c909f]">Course / Dept:</span> <span className="font-medium text-white">{selectedParticipant.course_name || "N/A"} ({selectedParticipant.department || "N/A"})</span></div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between"><span className="text-[#8c909f]">Year of Passing:</span> <span className="font-medium text-white">{selectedParticipant.year_of_passing || "N/A"}</span></div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between"><span className="text-[#8c909f]">Contact Number:</span> <span className="font-medium text-white">{selectedParticipant.contact || "N/A"}</span></div>
              </div>

              <div className="mt-6">
                <button onClick={() => setSelectedParticipant(null)} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all cursor-pointer">Close Profile Review</button>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE MODAL */}
        {showProfile && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) handleCloseProfile(); }}>
            <div className="glass-modal w-full max-w-md rounded-3xl p-8 relative animate-slide-up">
              
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