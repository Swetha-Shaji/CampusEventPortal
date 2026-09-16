// src/pages/EventDetails.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function EventDetails() {
  const { id } = useParams();
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

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [comments, setComments] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [formData, setFormData] = useState({});

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState({ type: "", text: "" });
  const [previousBroadcasts, setPreviousBroadcasts] = useState([]);

  const getToken = () => sessionStorage.getItem("token");

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/admin-login", { replace: true });
  };

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "A");
  const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "Admin");

  const fetchUserProfile = async () => {
    const token = getToken();
    if (!token) return navigate("/login");
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

  const fetchEvent = async () => {
    const token = getToken();
    if (!token) return navigate("/admin-login");
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } });
      const foundEvent = response.data.find(e => e.id === parseInt(id));
      if (!foundEvent) throw new Error("Event not found");
      setEvent(foundEvent);
      
      fetchEventComments(foundEvent.id);
      fetchPreviousBroadcasts(foundEvent.id);
    } catch (err) {
      setError("Failed to load event details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEventComments = async (eventId) => {
    const token = getToken();
    try {
      const res = await axios.get(`${API_URL}/events/${eventId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(res.data || []);
    } catch (err) {
      setComments([]);
    }
  };

  const fetchPreviousBroadcasts = async (eventId) => {
    const token = getToken();
    try {
      const res = await axios.get(`${API_URL}/events/${eventId}/broadcasts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviousBroadcasts(res.data || []);
    } catch (err) {
      setPreviousBroadcasts([]);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchEvent();
  }, [id, navigate]);

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

  const handlePostAdminReply = async (commentId) => {
    const reply = adminReplyText[commentId];
    if (!reply || !reply.trim()) return;

    try {
      const token = getToken();
      const res = await axios.put(`${API_URL}/admin/discussions/${commentId}`, {
        admin_reply: reply.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });

      setComments(prev => prev.map(c => c.id === commentId ? { ...c, ...res.data } : c));
      setAdminReplyText(prev => ({ ...prev, [commentId]: "" }));
    } catch (err) {
      const currentTime = new Date().toISOString();
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, admin_reply: reply.trim(), admin_replied_at: currentTime } : c));
      setAdminReplyText(prev => ({ ...prev, [commentId]: "" }));
    }
  };

  const handleSendBroadcast = async (messageText) => {
    try {
      const token = getToken();
      await axios.post(`${API_URL}/events/${event.id}/broadcast`, {
        message: messageText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPreviousBroadcasts(event.id);
    } catch (err) {
      console.error("Failed to automatically broadcast event update.");
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "TBD";
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCommentTime = (dateString) => {
    if (!dateString) return "Recently";
    
    // FIX: Append 'Z' to tell the browser this is a UTC timestamp, 
    // forcing it to automatically convert to the user's local time (IST).
    const safeDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
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

  const openEditModal = () => {
    setFormData({
      title: event.title, 
      description: event.description, 
      category: event.category || "others",
      event_format: event.event_format || "individual", 
      min_team_size: event.min_team_size || "", 
      max_team_size: event.max_team_size || "",
      date_from: event.date_from ? event.date_from.split("T")[0] : "",
      date_to: event.date_to ? event.date_to.split("T")[0] : "",
      registration_deadline: event.registration_deadline ? event.registration_deadline.split("T")[0] : "",
      location_type: event.location_type || "offline", 
      location: event.location || "", 
      location_link: event.location_link || "",
      meet_url: event.meet_url || "", 
      contact: event.contact || "",
      organization_name: event.organization_name || "",
    });
    setBannerFile(null); 
    setFormError(""); 
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setBannerFile(e.target.files[0]);

  const handleInitialEditSave = (e) => {
  e.preventDefault(); 
  setFormError("");
  
  // 1. Check for empty required fields
  if (!formData.title?.trim() || !formData.date_from || !formData.date_to || !formData.registration_deadline || !formData.organization_name?.trim() || !formData.contact?.trim()) {
    return setFormError("Please fill in all required fields including End Date and Contact Details.");
  }

  // 2. Validate Contact Number (exact 10 digits)
  if (!/^\d{10}$/.test(formData.contact.trim())) {
    return setFormError("Contact must contain exactly 10 digits.");
  }

  // 3. Validate Dates logically
  const startDate = new Date(formData.date_from);
  const endDate = new Date(formData.date_to);
  const deadlineDate = new Date(formData.registration_deadline);

  if (endDate < startDate) {
    return setFormError("End Date cannot be before the Start Date.");
  }
  if (deadlineDate > startDate) {
    return setFormError("Registration deadline must be before or on the Start Date.");
  }

  // 4. Validate Team Event logic
  if (formData.event_format === "team") {
    if (!formData.min_team_size || !formData.max_team_size) {
      return setFormError("Min and Max participants are required for team events.");
    }
    
    const minSize = parseInt(formData.min_team_size, 10);
    const maxSize = parseInt(formData.max_team_size, 10);
    
    if (minSize < 2) return setFormError("Minimum participants must be 2 or more for a team.");
    if (minSize === maxSize) return setFormError("Maximum participants cannot be the same as the minimum.");
    if (maxSize <= minSize) return setFormError("Maximum participants must be greater than the minimum.");
  }

  // 5. Validate Location logic
  if (formData.location_type === "offline" && !formData.location?.trim()) {
    return setFormError("Location Name is required for offline events.");
  }

  // If all validations pass, proceed to confirmation modal
  setIsEditModalOpen(false);
  setIsConfirmModalOpen(true);
  };

  const executeEventUpdate = async () => {
    setIsSubmitting(true); 
    const token = getToken();
    const data = new FormData();
    data.append("title", formData.title); 
    data.append("description", formData.description); 
    data.append("category", formData.category); 
    data.append("event_format", formData.event_format);
    data.append("organization_name", formData.organization_name);
    if (formData.event_format === "team") { 
      data.append("min_team_size", formData.min_team_size); 
      data.append("max_team_size", formData.max_team_size); 
    }
    data.append("location_type", formData.location_type); 
    data.append("date_from", formData.date_from);
    if (formData.date_to) {
      data.append("date_to", formData.date_to);
    }
    data.append("registration_deadline", formData.registration_deadline);

    if (formData.contact) data.append("contact", formData.contact);
    if (formData.location_type === "offline") { 
      data.append("location", formData.location); 
      data.append("location_link", formData.location_link ? formData.location_link.trim() : ""); 
      data.append("meet_url", ""); 
    } else { 
      data.append("location", ""); 
      data.append("location_link", ""); 
      data.append("meet_url", formData.meet_url ? formData.meet_url.trim() : ""); 
    }
    if (bannerFile) data.append("banner", bannerFile);

    try {
      await axios.put(`${API_URL}/events/${event.id}`, data, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      
      await handleSendBroadcast(`Notice: The event details for "${formData.title}" have been updated by the coordinator.`);

      setIsConfirmModalOpen(false);
      fetchEvent(); 
      
      setSuccessMsg("Event updated successfully and students have been notified!");
      setTimeout(() => setSuccessMsg(""), 4000);
      
    } catch (err) { 
      setFormError(err.response?.data?.detail || "Failed to update event."); 
      setIsConfirmModalOpen(false);
      setIsEditModalOpen(true);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const confirmDelete = async () => {
    if (!deleteReason || !deleteReason.trim()) {
      setDeleteError("Please provide a reason for cancellation.");
      return;
    }

    setIsDeleting(true); 
    setDeleteError("");

    try {
      const token = getToken();
      await axios.delete(`${API_URL}/events/${event.id}?reason=${encodeURIComponent(deleteReason.trim())}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      setSuccessMsg("Event cancelled successfully");
      setTimeout(() => {
        setSuccessMsg("");
        navigate("/manage-events");
      }, 1500);
    } catch (err) { 
      setDeleteError(err.response?.data?.detail || "Failed to cancel event."); 
      setIsDeleting(false); 
    }
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
      `}</style>

      <div className="min-h-screen bg-[#0a0f1c] text-[#dae2fd]" style={{ fontFamily: "'Inter', sans-serif" }}>
        
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

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-10">
          
          <Link to="/manage-events" className="inline-flex items-center gap-2 text-[#8c909f] hover:text-white transition-colors group w-max">
            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span className="font-semibold tracking-wide">Back to Events</span>
          </Link>

          {successMsg && (
             <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 flex items-center justify-center gap-2 animate-fade-in shadow-[0_0_15px_rgba(34,197,94,0.2)]">
               <span className="material-symbols-outlined">check_circle</span>
               <span className="font-medium text-lg tracking-wide">{successMsg}</span>
             </div>
          )}

          {loading ? (
            <div className="text-center py-20 text-red-400 animate-pulse text-xl font-bold">Loading Event...</div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center font-medium">{error}</div>
          ) : event && (
            <div className="space-y-10 animate-fade-in">
              <div className="flex flex-col lg:flex-row gap-10">
                
                <div className="w-full lg:w-[40%] flex-shrink-0 animate-slide-up">
                  <div className="glass-card rounded-3xl overflow-hidden shadow-[0_15px_40px_rgba(220,38,38,0.15)] aspect-[2/3] sticky top-32">
                    {event.banner_url ? (
                      <img src={`${API_URL}${event.banner_url}`} alt={event.title} className="w-full h-full object-cover object-center" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-[#8c909f] text-2xl font-bold p-6 text-center">{event.title}</div>
                    )}
                    <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur-md px-4 py-1.5 text-sm font-bold rounded-full text-white capitalize shadow-lg border border-red-400/30">
                      {event.category || "General"}
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[60%] flex flex-col gap-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                  <div className="glass-card p-8 md:p-10 rounded-3xl">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>{event.title}</h1>
                    
                    <div className="flex flex-wrap gap-4 mb-8 pb-8 border-b border-white/10">
                      <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                        <span className="material-symbols-outlined text-red-400">calendar_today</span>
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
                        <span className="material-symbols-outlined text-orange-400">{event.event_format === 'team' ? 'groups' : 'person'}</span>
                        <span className="font-medium capitalize">
                          {event.event_format === 'team' ? `Team (${event.min_team_size}-${event.max_team_size})` : 'Individual'}
                        </span>
                      </div>
                      {event.organization_name && (
                        <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                          <span className="material-symbols-outlined text-purple-400">domain</span>
                          <span className="font-medium">{event.organization_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-purple-400">description</span> About the Event
                        </h3>
                        <p className="text-[#8c909f] leading-relaxed whitespace-pre-line text-[15px]">{event.description}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                        <div>
                          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-[#8c909f]">Location Details</h3>
                          <div className="flex items-start gap-2 text-[#dae2fd]">
                            <span className="material-symbols-outlined text-blue-400 mt-0.5">{event.location_type === "online" ? "language" : "location_on"}</span>
                            {event.location_type === "online" ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">Online Event</span>
                                {event.meet_url && (
                                  <a href={event.meet_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 text-sm">
                                    Meeting Link <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{event.location}</span>
                                {event.location_link && (
                                  <a href={event.location_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 text-sm">
                                    View on Map <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {event.contact && (
                          <div>
                            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-[#8c909f]">Contact Point</h3>
                            <div className="flex items-center gap-2 text-[#dae2fd]">
                              <span className="material-symbols-outlined text-green-400">support_agent</span>
                              <span className="font-medium">{event.contact}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {!(event.status === 'cancelled' || event.status === 'completed') && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                      <button onClick={openEditModal} className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all flex justify-center items-center gap-2 shadow-lg cursor-pointer">
                        <span className="material-symbols-outlined">edit</span> Edit Event
                      </button>
                      <button onClick={() => { setIsBroadcastModalOpen(true); setBroadcastStatus({ type: "", text: "" }); setBroadcastText(""); fetchPreviousBroadcasts(event.id); }} className="py-4 bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 text-orange-400 hover:text-white font-bold rounded-2xl transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] cursor-pointer">
                        <span className="material-symbols-outlined">campaign</span> Send Broadcast
                      </button>
                      <button onClick={() => setIsDeleteModalOpen(true)} className="py-4 bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white font-bold rounded-2xl transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] cursor-pointer">
                        <span className="material-symbols-outlined">cancel</span> Cancel Event
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-8 md:p-10 rounded-3xl space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Participant Q&A & Doubts</h3>
                  <p className="text-[#8c909f] text-sm">Review queries submitted by participants and provide official organizer responses.</p>
                </div>

                <div className="space-y-4 pt-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-[#8c909f] mb-2">chat_bubble_outline</span>
                      <p className="text-sm text-[#8c909f]">No participant questions or doubts yet.</p>
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base">{c.user_name || c.userName}</span>
                            <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold uppercase rounded-md">Participant</span>
                          </div>
                          <span className="text-xs text-[#8c909f]">Sent: {formatCommentTime(c.created_at || c.createdAt)}</span>
                        </div>

                        <p className="text-sm text-[#dae2fd] bg-black/20 p-3.5 rounded-xl border border-white/5">{c.message}</p>

                        {(c.admin_reply || c.adminReply) ? (
                          <div className="bg-red-600/10 border border-red-500/30 p-4 rounded-xl ml-6 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wide block">Event Coordinator</span>
                              <span className="text-[11px] text-red-300/80">Replied: {formatCommentTime(c.admin_replied_at || c.adminRepliedAt)}</span>
                            </div>
                            <p className="text-sm text-white">{c.admin_reply || c.adminReply}</p>
                          </div>
                        ) : (event.status === 'cancelled' || event.status === 'completed') ? (
                          <div className="text-xs text-[#8c909f] ml-6 pt-2 italic">Replies are disabled for this event.</div>
                        ) : (
                          <div className="flex gap-2 pt-2 ml-6">
                            <input 
                              type="text" 
                              placeholder="Type official reply visible to all candidates..." 
                              value={adminReplyText[c.id] || ""}
                              onChange={(e) => setAdminReplyText({ ...adminReplyText, [c.id]: e.target.value })}
                              className="flex-1 bg-[#1e293b]/50 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:border-red-500 outline-none"
                            />
                            <button onClick={() => handlePostAdminReply(c.id)} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer">
                              Post Reply
                            </button>
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) handleCloseProfile(); }}>
            <div className="glass-modal w-full max-w-md rounded-3xl p-8 relative animate-slide-up">
              
              <div className="absolute top-5 right-5 flex items-center gap-2">
                {!isEditingProfile && (
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all text-sm font-medium shadow-sm"
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

        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in py-10 overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && !isSubmitting) setIsEditModalOpen(false); }}>
            <div className="glass-modal w-full max-w-2xl rounded-3xl p-8 relative animate-slide-up my-auto mt-10">
              <button onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all"><span className="material-symbols-outlined text-xl">close</span></button>
              <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>Edit Event</h2>

              <form onSubmit={handleInitialEditSave} className="space-y-4">
                {formError && (<div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm font-medium text-red-400 text-center">{formError}</div>)}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Event Title *</label><input type="text" name="title" value={formData.title} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                  <div>
                    <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Event Category *</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all appearance-none cursor-pointer">
                      <option value="conference">Conference</option><option value="courses">Courses (Student/Faculty)</option><option value="hackathons">Hackathons</option><option value="jobfair">Job Fair</option><option value="internship">Internship</option><option value="workshop">Workshop</option><option value="collegefest">College Fest</option><option value="others">Others</option>
                    </select>
                  </div>
                </div>

                <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Description *</label><textarea name="description" value={formData.description} onChange={handleInputChange} required rows="2" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all"></textarea></div>

                <div>
                  <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Event Format *</label>
                  <select name="event_format" value={formData.event_format} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all appearance-none cursor-pointer">
                    <option value="individual">Individual Event</option><option value="team">Team Event</option>
                  </select>
                </div>

                {formData.event_format === "team" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Min Participants *</label><input type="number" min="1" name="min_team_size" value={formData.min_team_size} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                    <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Max Participants *</label><input type="number" min="1" name="max_team_size" value={formData.max_team_size} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Start Date *</label><input type="date" name="date_from" value={formData.date_from} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all [color-scheme:dark]" /></div>
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">End Date *</label><input type="date" name="date_to" value={formData.date_to} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all [color-scheme:dark]" /></div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Registration Deadline *</label>
                  <input type="date" name="registration_deadline" value={formData.registration_deadline} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all [color-scheme:dark]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Contact Details *</label><input type="text" name="contact" value={formData.contact} onChange={handleInputChange} required placeholder="E.g., Prof. John Doe" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">College / Organization Name *</label><input type="text" name="organization_name" value={formData.organization_name} onChange={handleInputChange} required placeholder="E.g., SCMS College" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Location Type *</label>
                  <select name="location_type" value={formData.location_type} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all appearance-none cursor-pointer">
                    <option value="offline">Offline / Physical Location</option><option value="online">Online / Virtual Event</option>
                  </select>
                </div>

                {formData.location_type === "offline" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Location Name *</label><input type="text" name="location" value={formData.location} onChange={handleInputChange} required className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                    <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Google Maps Link</label><input type="url" name="location_link" value={formData.location_link} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                  </div>
                ) : (
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Meeting Link (Optional)</label>
                    <input type="url" name="meet_url" value={formData.meet_url} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Banner Image (Leave blank to keep current)</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 w-full text-sm text-[#8c909f] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/25 transition-all bg-[#1e293b]/50 border border-white/10 rounded-xl" />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 bg-transparent border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-semibold">Cancel</button>
                  <button type="submit" className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] cursor-pointer">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-modal w-full max-w-md rounded-3xl p-8 relative animate-slide-up text-center space-y-5">
              <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Are you sure?</h3>
              <p className="text-[#8c909f] text-sm leading-relaxed">
                The changes made will be notified to students. Do you want to proceed and save these modifications?
              </p>
              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => { setIsConfirmModalOpen(false); setIsEditModalOpen(true); }} 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={executeEventUpdate} 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50 text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? "Saving..." : "Yes, Confirm & Notify"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isBroadcastModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in py-10 overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget && !isBroadcasting) setIsBroadcastModalOpen(false); }}>
            <div className="glass-modal w-full max-w-xl rounded-3xl p-8 relative animate-slide-up my-auto">
              <button onClick={() => setIsBroadcastModalOpen(false)} disabled={isBroadcasting} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/30 text-orange-400">
                  <span className="material-symbols-outlined text-2xl">campaign</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Send Broadcast</h2>
                  <p className="text-[#8c909f] text-xs">Notify all registered candidates for this event</p>
                </div>
              </div>

              {broadcastStatus.text && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center ${broadcastStatus.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"}`}>
                  {broadcastStatus.text}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSendBroadcast(broadcastText); setBroadcastStatus({ type: "success", text: "Broadcast message successfully sent!" }); setBroadcastText(""); }} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1 block mb-1.5">New Broadcast Message *</label>
                  <textarea 
                    value={broadcastText} 
                    onChange={(e) => setBroadcastText(e.target.value)} 
                    required 
                    rows="3" 
                    placeholder="Type important announcements, schedule updates, or venue changes..." 
                    disabled={isBroadcasting}
                    className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-orange-500 text-white px-4 py-3 rounded-xl transition-all resize-none outline-none text-sm"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-1">
                  <button 
                    type="button" 
                    onClick={() => setIsBroadcastModalOpen(false)} 
                    disabled={isBroadcasting} 
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm cursor-pointer"
                  >
                    Close
                  </button>
                  <button 
                    type="submit" 
                    disabled={isBroadcasting} 
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    Send Broadcast
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[#8c909f]">Previous Broadcasts Sent ({previousBroadcasts.length})</h3>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {previousBroadcasts.length === 0 ? (
                    <p className="text-xs text-[#8c909f] text-center py-4">No previous broadcasts found for this event.</p>
                  ) : (
                    previousBroadcasts.map((b) => (
                      <div key={b.id} className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-[#8c909f]">
                          <span className="text-orange-400 font-bold uppercase">Broadcast Notice</span>
                          <span>{formatCommentTime(b.created_at)}</span>
                        </div>
                        <p className="text-xs text-white leading-relaxed">{b.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget && !isDeleting) setIsDeleteModalOpen(false); }}>
            <div className="glass-modal w-full max-w-md rounded-3xl p-8 relative animate-slide-up space-y-4">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                <span className="material-symbols-outlined text-2xl text-red-400">warning</span>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Cancel Event?</h2>
                <p className="text-[#8c909f] text-xs">Are you sure you want to cancel <span className="font-bold text-white">{event.title}</span>?</p>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-medium text-red-400 text-center">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1 block mb-1.5">Reason for Cancellation *</label>
                <textarea 
                  value={deleteReason} 
                  onChange={(e) => setDeleteReason(e.target.value)} 
                  required 
                  rows="3" 
                  placeholder="E.g., Due to unforeseen circumstances, this event has been cancelled..." 
                  disabled={isDeleting}
                  className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all resize-none outline-none text-sm"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => { setIsDeleteModalOpen(false); setDeleteReason(""); setDeleteError(""); }} 
                  disabled={isDeleting} 
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm cursor-pointer"
                >
                  Close
                </button>
                <button 
                  onClick={confirmDelete} 
                  disabled={isDeleting} 
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? "Processing..." : "Confirm & Notify"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}