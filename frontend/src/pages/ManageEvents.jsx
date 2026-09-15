// src/pages/ManageEvents.jsx

import { useEffect, useState } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function ManageEvents() {
  const navigate = useNavigate();
  const { id } = useParams();

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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [unrepliedCounts, setUnrepliedCounts] = useState({});
  const [comments, setComments] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingDraftId, setEditingDraftId] = useState(null);

  // -----------------------------
  // Search & Filter States
  // -----------------------------
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [filterLocationType, setFilterLocationType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [eventSortBy, setEventSortBy] = useState("date_nearest");

  // -----------------------------
  // Pagination States
  // -----------------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  const [formData, setFormData] = useState({
    title: "", description: "", category: "others", event_format: "individual",
    min_team_size: "", max_team_size: "", start_date: "", end_date: "", registration_deadline: "",
    location_type: "offline", location: "", location_link: "", meet_url: "", contact: "", 
    organization_name: "", scheduled_publish_date: "",
  });
  const [bannerFile, setBannerFile] = useState(null);

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
      const response = await axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      setUserName(response.data.name || "Admin");
      setUserEmail(response.data.email || "");
      setProfileData({ name: response.data.name || "", email: response.data.email || "", password: "" });
    } catch (err) { if (err.response?.status === 401) handleLogout(); }
  };

  const fetchEvents = async () => {
    const token = getToken();
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } });
      
      const activeEvents = response.data;
      setEvents(activeEvents);
      
      if (id) {
        const found = activeEvents.find(e => e.id === parseInt(id));
        setSelectedEvent(found || null);
        if (found) {
          fetchEventComments(found.id);
        }
      } else {
        setSelectedEvent(null);
      }
    } catch (err) {
      setError("Failed to load events. Please try again.");
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

  useEffect(() => {
    if (events.length > 0) {
      const fetchAllCounts = async () => {
        const token = getToken();
        const counts = {};
        for (const ev of events) {
          try {
            const res = await axios.get(`${API_URL}/events/${ev.id}/comments`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const unreplied = (res.data || []).filter(c => !c.admin_reply).length;
            counts[ev.id] = unreplied;
          } catch (err) {
            counts[ev.id] = 0;
          }
        }
        setUnrepliedCounts(counts);
      };
      fetchAllCounts();
    }
  }, [events]);

  useEffect(() => { 
    fetchUserProfile(); 
    fetchEvents(); 
  }, [navigate, id]);

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

  const toLocalDatetimeLocal = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString.endsWith('Z') ? dateString : `${dateString}Z`);
    if (isNaN(date.getTime())) return "";
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().substring(0, 16);
  };

  const openCreateModal = () => {
    setEditingDraftId(null);
    setFormData({ title: "", description: "", category: "others", event_format: "individual", min_team_size: "", max_team_size: "", start_date: "", end_date: "", registration_deadline: "", location_type: "offline", location: "", location_link: "", meet_url: "", contact: "", organization_name: "", scheduled_publish_date: "" });
    setBannerFile(null); setFormError(""); setIsModalOpen(true);
  };

  const openDraftModal = (event) => {
    setEditingDraftId(event.id);
    setFormData({
      title: event.title || "",
      description: event.description || "",
      category: event.category || "others",
      event_format: event.event_format || "individual",
      min_team_size: event.min_team_size || "",
      max_team_size: event.max_team_size || "",
      start_date: event.date_from ? event.date_from.split("T")[0] : "",
      end_date: event.date_to ? event.date_to.split("T")[0] : "",
      registration_deadline: event.registration_deadline ? event.registration_deadline.split("T")[0] : "",
      location_type: event.location_type || "offline",
      location: event.location || "",
      location_link: event.location_link || "",
      meet_url: event.meet_url || "",
      contact: event.contact || "",
      organization_name: event.organization_name || "",
      scheduled_publish_date: toLocalDatetimeLocal(event.scheduled_publish_date),
    });
    setBannerFile(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => { if (!isSubmitting) { setIsModalOpen(false); setIsScheduleModalOpen(false); } };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setBannerFile(null);
      return;
    }

    // 1. Validate File Type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFormError("Only JPG, JPEG, PNG, and WEBP formats are allowed.");
      e.target.value = ""; // Reset input
      setBannerFile(null);
      return;
    }

    // 2. Validate File Size (Maximum 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      setFormError("File size must be exactly 5MB or less.");
      e.target.value = ""; // Reset input
      setBannerFile(null);
      return;
    }

    // If validations pass, clear errors and set the file
    setFormError(""); 
    setBannerFile(file);
  };

  const validateDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = formData.start_date ? new Date(formData.start_date) : null;
    const endDate = formData.end_date ? new Date(formData.end_date) : null;
    const deadlineDate = formData.registration_deadline ? new Date(formData.registration_deadline) : null;

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);
    if (deadlineDate) deadlineDate.setHours(0, 0, 0, 0);

    if (startDate && startDate <= today) {
      return "Start date must not be current or previous date.";
    }

    if (startDate && endDate && endDate < startDate) {
      return "End date cannot be before start date.";
    }

    if (deadlineDate) {
      if (deadlineDate <= today) {
        return "Registration deadline must be after the current date.";
      }
      if (startDate && deadlineDate > startDate) {
        return "Registration deadline must be the same as start date or before start date.";
      }
    }

    return null;
  };

  const checkCommonValidations = (targetStatus) => {
    const requiredError = targetStatus === "scheduled" 
      ? "All required fields must be provided for scheduling." 
      : "All required fields must be provided for publishing event.";

    if (
      !formData.title || 
      !formData.description || 
      !formData.category || 
      !formData.start_date || 
      !formData.end_date || 
      !formData.registration_deadline || 
      !formData.location_type || 
      !formData.organization_name || 
      !formData.contact
    ) {
      return requiredError;
    }

    if (formData.contact.trim() && !/^\d{10}$/.test(formData.contact.trim())) {
      return "Contact must contain exact 10 digits";
    }

    const dateValidationError = validateDates();
    if (dateValidationError) {
      return dateValidationError;
    }

    if (!bannerFile && !editingDraftId) {
      return requiredError;
    }

    if (formData.event_format === "team") {
      if (!formData.min_team_size || !formData.max_team_size) {
        return requiredError;
      }
      const minSize = parseInt(formData.min_team_size, 10);
      const maxSize = parseInt(formData.max_team_size, 10);

      if (minSize < 2) {
        return "Minimum number of participants must be 2 or above for team events.";
      }
      if (minSize === maxSize) {
        return "Maximum participants cannot be the same as minimum participants.";
      }
      if (maxSize <= minSize) {
        return "Maximum participants must be greater than minimum participants.";
      }
    }

    if (formData.location_type === "offline" && !formData.location.trim()) {
      return requiredError;
    }

    return null;
  };

  const handlePublishSubmit = (e) => {
    e.preventDefault();
    handleMainSubmit("active");
  };

  const handleConfirmSchedule = () => {
    if (!formData.scheduled_publish_date) {
      return setFormError("All required fields must be provided for scheduling.");
    }

    const scheduledDateTime = new Date(formData.scheduled_publish_date);
    const now = new Date();

    if (scheduledDateTime <= now) {
      alert("Scheduled date and time cannot be in the past or current time.");
      return;
    }
    
    const validationError = checkCommonValidations("scheduled");
    if (validationError) {
      setIsScheduleModalOpen(false);
      return setFormError(validationError);
    }

    setIsScheduleModalOpen(false);
    handleMainSubmit("scheduled");
  };

  const handleMainSubmit = async (targetStatus) => {
    setFormError("");
    
    const validationError = checkCommonValidations(targetStatus);
    if (validationError) {
      return setFormError(validationError);
    }

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
    
    if (formData.start_date) data.append("date_from", formData.start_date);
    if (formData.end_date) data.append("date_to", formData.end_date);
    if (formData.registration_deadline) data.append("registration_deadline", formData.registration_deadline);

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
    
    data.append("status", targetStatus);
    if (targetStatus === "scheduled" && formData.scheduled_publish_date) {
      const utcDateStr = new Date(formData.scheduled_publish_date).toISOString();
      data.append("scheduled_publish_date", utcDateStr);
    }

    try {
      if (editingDraftId) {
        await axios.put(`${API_URL}/events/${editingDraftId}`, data, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
        setSuccessMsg(targetStatus === "scheduled" ? "Event scheduled successfully!" : "Event published successfully!");
      } else {
        await axios.post(`${API_URL}/events`, data, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
        setSuccessMsg(targetStatus === "scheduled" ? "Event scheduled successfully!" : "Event created successfully!");
      }
      setTimeout(() => setSuccessMsg(""), 3000);
      closeModal(); 
      fetchEvents(); 
    } catch (err) { 
      setFormError(err.response?.data?.detail || "Failed to save the event."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleSaveAsDraft = async () => {
    setFormError("");
    
    if (!formData.title.trim() || !formData.category || !formData.organization_name.trim()) {
      return setFormError("Event Title, Category, and College / Organization Name are compulsory to save as a draft.");
    }

    if (formData.contact.trim() && !/^\d{10}$/.test(formData.contact.trim())) {
      return setFormError("Contact must contain exact 10 digits");
    }

    setIsSubmitting(true);
    const token = getToken();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("category", formData.category);
    data.append("organization_name", formData.organization_name);
    data.append("status", "draft");

    if (formData.description) data.append("description", formData.description);
    if (formData.start_date) data.append("date_from", formData.start_date);
    if (formData.end_date) data.append("date_to", formData.end_date);
    if (formData.registration_deadline) data.append("registration_deadline", formData.registration_deadline);
    if (formData.event_format) data.append("event_format", formData.event_format);
    if (formData.location_type) data.append("location_type", formData.location_type);
    if (formData.location) data.append("location", formData.location);
    if (formData.contact) data.append("contact", formData.contact);
    if (bannerFile) data.append("banner", bannerFile);

    try {
      if (editingDraftId) {
        await axios.put(`${API_URL}/events/${editingDraftId}`, data, { 
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } 
        });
      } else {
        await axios.post(`${API_URL}/events`, data, { 
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } 
        });
      }
      closeModal(); 
      fetchEvents(); 
      setSuccessMsg("Event saved as draft successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) { 
      setFormError(err.response?.data?.detail || "Failed to save draft."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "TBD";
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // -----------------------------
  // Filter & Sort Logic
  // -----------------------------
  const filteredAndSortedEvents = events
    .filter(event => {
      const query = eventSearchQuery.toLowerCase();
      const titleMatch = event.title?.toLowerCase().includes(query);
      const orgMatch = event.organization_name?.toLowerCase().includes(query);
      const locationMatch = event.location?.toLowerCase().includes(query) || (event.location_type === "online" && "online".includes(query));

      const matchesSearch = !eventSearchQuery || titleMatch || orgMatch || locationMatch;
      const matchesLocationType = filterLocationType === "all" || event.location_type === filterLocationType;
      const matchesCategory = filterCategory === "all" || event.category === filterCategory;
      const matchesStatus = filterStatus === "all" || event.status === filterStatus;

      return matchesSearch && matchesLocationType && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (eventSortBy === "date_nearest") {
        return new Date(a.date_from || 0) - new Date(b.date_from || 0);
      } else if (eventSortBy === "date_furthest") {
        return new Date(b.date_from || 0) - new Date(a.date_from || 0);
      }
      return b.id - a.id;
    });

  // -----------------------------
  // Pagination Calculations
  // -----------------------------
  const totalPages = Math.ceil(filteredAndSortedEvents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEvents = filteredAndSortedEvents.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredAndSortedEvents.length, currentPage, totalPages]);

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

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          filter: invert(1) hue-rotate(180deg);
          opacity: 0.7;
          cursor: pointer;
        }
        input[type="number"]::-webkit-inner-spin-button:hover,
        input[type="number"]::-webkit-outer-spin-button:hover {
          opacity: 1;
        }
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

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
          
          {successMsg && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 flex items-center justify-center gap-2 animate-fade-in shadow-[0_0_15px_rgba(34,197,94,0.2)] mb-6">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-medium text-lg tracking-wide">{successMsg}</span>
            </div>
          )}

          {id ? (
            <div className="space-y-10 animate-fade-in">
              <Link to="/manage-events" className="inline-flex items-center gap-2 text-[#8c909f] hover:text-white transition-colors group w-max">
                <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                <span className="font-semibold tracking-wide">Back to Manage Events</span>
              </Link>

              {loading ? (
                <div className="text-center py-20 text-red-400 animate-pulse text-xl font-bold">Loading event details...</div>
              ) : !selectedEvent ? (
                <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center font-medium">Event not found.</div>
              ) : (
                <div className="space-y-10">
                  <div className="flex flex-col lg:flex-row gap-10 items-start">
                    
                    <div className="w-full lg:w-[40%] flex-shrink-0">
                      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl aspect-[2/3] border border-red-500/30 relative">
                        {selectedEvent.banner_url ? (
                          <img src={`${API_URL}${selectedEvent.banner_url}`} alt={selectedEvent.title} className="w-full h-full object-cover object-center" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-[#8c909f] text-2xl font-bold p-6 text-center">{selectedEvent.title}</div>
                        )}
                      </div>
                    </div>

                    <div className="w-full lg:w-[60%] glass-card p-8 md:p-10 rounded-3xl space-y-6">
                      <div>
                        <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider rounded-full mb-3 inline-block">
                          {selectedEvent.category}
                        </span>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3" style={{ fontFamily: "'Manrope', sans-serif" }}>{selectedEvent.title}</h1>
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-sm">
                            <span className="material-symbols-outlined text-red-400 text-[18px]">calendar_today</span>
                            <span>{formatDateDisplay(selectedEvent.date_from)} {selectedEvent.date_to ? `to ${formatDateDisplay(selectedEvent.date_to)}` : ''}</span>
                          </div>
                          {selectedEvent.registration_deadline && (
                            <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-sm">
                              <span className="material-symbols-outlined text-yellow-400 text-[18px]">event_busy</span>
                              <span>Reg Deadline: {formatDateDisplay(selectedEvent.registration_deadline)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[#dae2fd] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-sm">
                            <span className="material-symbols-outlined text-orange-400 text-[18px]">location_on</span>
                            <span>{selectedEvent.location_type === "online" ? "Online Meeting" : selectedEvent.location}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[#8c909f] mb-2">Description</h3>
                        <p className="text-[#8c909f] leading-relaxed whitespace-pre-line text-sm">{selectedEvent.description}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                          <span className="text-xs text-[#8c909f] uppercase block mb-1">Format</span>
                          <span className="font-semibold text-white capitalize">{selectedEvent.event_format}</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                          <span className="text-xs text-[#8c909f] uppercase block mb-1">Contact</span>
                          <span className="font-semibold text-white">{selectedEvent.contact || "N/A"}</span>
                        </div>
                        {selectedEvent.organization_name && (
                          <div className="bg-white/5 p-4 rounded-xl border border-white/5 sm:col-span-2">
                            <span className="text-xs text-[#8c909f] uppercase block mb-1">College / Organization</span>
                            <span className="font-semibold text-white">{selectedEvent.organization_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 gap-6">
                <header>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>Manage Events</h1>
                  <p className="text-[#8c909f] text-lg">Click a banner to view full event specifications and public discussions.</p>
                </header>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Link to="/admin/event-records" className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">analytics</span>
                    <span>Event Records</span>
                  </Link>
                  <button onClick={openCreateModal} className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 w-full md:w-auto hover:-translate-y-1">
                    <span className="material-symbols-outlined">add_circle</span>
                    <span>Create New Event</span>
                  </button>
                </div>
              </div>

              {/* --- ADVANCED SEARCH & FILTER CONTROLS BAR --- */}
              <div className="glass-card p-4 md:p-6 rounded-2xl mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#8c909f]">
                    <span className="material-symbols-outlined text-lg">search</span>
                  </span>
                  <input 
                    type="text"
                    placeholder="Search name, location, org..."
                    value={eventSearchQuery}
                    onChange={(e) => { setEventSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <select 
                    value={filterLocationType}
                    onChange={(e) => { setFilterLocationType(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="all">All Locations (Online & Offline)</option>
                    <option value="offline">Offline Only</option>
                    <option value="online">Online Only</option>
                  </select>
                </div>

                <div>
                  <select 
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
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
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <select 
                    value={eventSortBy}
                    onChange={(e) => { setEventSortBy(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="date_nearest">Date: Nearest First</option>
                    <option value="date_furthest">Date: Furthest First</option>
                  </select>
                </div>
              </div>

              {error && (
                 <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3 mb-8">
                   <span className="material-symbols-outlined">error</span><span className="font-medium">{error}</span>
                 </div>
              )}

              {loading ? (
                <div className="text-center py-20 text-red-400 animate-pulse">Loading events...</div>
              ) : currentEvents.length === 0 ? (
                <div className="bg-[rgba(30,41,59,0.4)] backdrop-blur-md rounded-2xl p-12 text-center border-dashed border-2 border-white/10">
                  <span className="material-symbols-outlined text-6xl text-red-400/50 mb-4">search_off</span>
                  <h3 className="text-2xl font-bold text-white mb-2">No events match your criteria</h3>
                  <p className="text-[#8c909f]">Try adjusting your search query or filters.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start">
                    {currentEvents.map((event) => {
                      const isDraft = event.status === 'draft';
                      const isScheduled = event.status === 'scheduled';
                      const isCancelled = event.status === 'cancelled';
                      
                      const cardContent = (
                        <div className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-[2/3] shadow-lg border border-white/10 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(220,38,38,0.25)] bg-[#050810]">
                          {unrepliedCounts[event.id] > 0 && (
                            <div className="absolute top-3 left-3 z-20 bg-red-600 text-white text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-white/20 animate-pulse">
                              {unrepliedCounts[event.id]}
                            </div>
                          )}

                          {isDraft && (
                            <div className="absolute top-3 right-3 z-20 bg-amber-500 text-black text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase shadow-md">
                              Draft
                            </div>
                          )}

                          {isScheduled && (
                            <div className="absolute top-3 right-3 z-20 bg-blue-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase shadow-md">
                              Scheduled
                            </div>
                          )}

                          {isCancelled && (
                            <div className="absolute top-3 right-3 z-20 bg-red-700 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase shadow-md">
                              Cancelled
                            </div>
                          )}

                          {event.banner_url ? (
                            <img src={`${API_URL}${event.banner_url}`} alt={event.title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-[#8c909f] p-4 text-center">{event.title} <br/>(No Image)</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <p className="text-white font-bold truncate w-full text-shadow-sm text-lg">{event.title}</p>
                          </div>
                        </div>
                      );

                      return (isDraft || isScheduled) ? (
                        <div key={event.id} onClick={() => openDraftModal(event)}>
                          {cardContent}
                        </div>
                      ) : (
                        <Link key={event.id} to={`/manage-events/${event.id}`}>
                          {cardContent}
                        </Link>
                      );
                    })}
                  </div>

                  {/* PAGINATION CONTROLS */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
                      <p className="text-xs text-[#8c909f]">
                        Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, filteredAndSortedEvents.length)}</span> of <span className="font-bold text-white">{filteredAndSortedEvents.length}</span> events
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
                </>
              )}
            </>
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

        {/* --- MAIN EVENT CREATE/EDIT MODAL --- */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in py-10 overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="glass-modal w-full max-w-2xl rounded-3xl p-8 relative animate-slide-up my-auto mt-10">
              <button onClick={closeModal} disabled={isSubmitting} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all"><span className="material-symbols-outlined text-xl">close</span></button>
              <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {editingDraftId ? "Resume & Publish/Schedule Event" : "Create New Event"}
              </h2>
              
              <form onSubmit={handlePublishSubmit} className="space-y-4">
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
                <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Description *</label><textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all"></textarea></div>
                
                <div>
                  <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Event Format</label>
                  <select name="event_format" value={formData.event_format} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all appearance-none cursor-pointer">
                    <option value="individual">Individual Event</option><option value="team">Team Event</option>
                  </select>
                </div>
                {formData.event_format === "team" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Min Participants per Team *</label><input type="number" min="1" name="min_team_size" value={formData.min_team_size} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                    <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Max Participants per Team *</label><input type="number" min="1" name="max_team_size" value={formData.max_team_size} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Start Date *</label><input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all [color-scheme:dark]" /></div>
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">End Date *</label><input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all [color-scheme:dark]" /></div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Registration Deadline *</label>
                  <input type="date" name="registration_deadline" value={formData.registration_deadline} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all [color-scheme:dark]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Contact Details *</label><input type="text" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="E.g., 9876543210" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                  <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">College / Organization Name *</label><input type="text" name="organization_name" value={formData.organization_name} onChange={handleInputChange} placeholder="E.g., SCMS College" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Location Type *</label>
                  <select name="location_type" value={formData.location_type} onChange={handleInputChange} className="mt-1 w-full bg-[#1e293b] border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all appearance-none cursor-pointer">
                    <option value="offline">Offline / Physical Location</option><option value="online">Online / Virtual Event</option>
                  </select>
                </div>
                
                {formData.location_type === "offline" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Location Name *</label><input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g. Main Auditorium" className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                    <div><label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Google Maps Link (Optional)</label><input type="url" name="location_link" value={formData.location_link} onChange={handleInputChange} placeholder="https://maps.app.goo.gl/..." className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" /></div>
                  </div>
                ) : (
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">Meeting Link *</label>
                    <input type="url" name="meet_url" value={formData.meet_url} onChange={handleInputChange} placeholder="https://meet.google.com/..." className="mt-1 w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3 rounded-xl transition-all" />
                  </div>
                )}
              

                <div>
                <label className="text-xs font-semibold text-[#8c909f] uppercase ml-1">
                  {editingDraftId ? "Banner Image (Leave blank to keep current)" : "Banner Image *"}
                </label>
                <input type="file" accept=".jpg, .jpeg, .png, .webp, image/jpeg, image/png, image/webp" onChange={handleFileChange} className="mt-1 w-full text-sm text-[#8c909f] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all bg-[#1e293b]/50 border border-white/10 rounded-xl"  />
              </div>
                
                <div className="pt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={closeModal} disabled={isSubmitting} className="py-3 px-3 bg-transparent border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-semibold disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={handleSaveAsDraft} disabled={isSubmitting} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-sm">Save as Draft</button>
                  <button type="button" onClick={() => { 
                    if (
                      !formData.title || 
                      !formData.description || 
                      !formData.category || 
                      !formData.start_date || 
                      !formData.end_date || 
                      !formData.registration_deadline || 
                      !formData.location_type || 
                      !formData.organization_name || 
                      !formData.contact
                    ) {
                      setFormError("All required fields must be provided for scheduling.");
                      return;
                    }

                    if (formData.contact.trim() && !/^\d{10}$/.test(formData.contact.trim())) {
                      setFormError("Contact must contain exact 10 digits");
                      return;
                    }

                    const dateValidationError = validateDates();
                    if (dateValidationError) {
                      setFormError(dateValidationError);
                      return;
                    }

                    if (!bannerFile && !editingDraftId) {
                      setFormError("All required fields must be provided for scheduling.");
                      return;
                  }

                    if (formData.event_format === "team") {
                      if (!formData.min_team_size || !formData.max_team_size) {
                        setFormError("All required fields must be provided for scheduling.");
                        return;
                      }
                      const minSize = parseInt(formData.min_team_size, 10);
                      const maxSize = parseInt(formData.max_team_size, 10);

                      if (minSize < 2) {
                        setFormError("Minimum number of participants must be 2 or above for team events.");
                        return;
                      }
                      if (minSize === maxSize) {
                        setFormError("Maximum participants cannot be the same as minimum participants.");
                        return;
                      }
                      if (maxSize <= minSize) {
                        setFormError("Maximum participants must be greater than minimum participants.");
                        return;
                      }
                    }

                    if (formData.location_type === "offline" && !formData.location.trim()) {
                      setFormError("All required fields must be provided for scheduling.");
                      return;
                    }

                    setFormError(""); 
                    setIsScheduleModalOpen(true); 
                  }} disabled={isSubmitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-sm">Schedule Event</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 text-sm">{editingDraftId ? "Publish Now" : "Publish Event"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- SCHEDULE DATE CONFIRMATION MODAL --- */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-modal w-full max-w-md rounded-3xl p-6 relative animate-slide-up space-y-4 text-center border border-white/15 shadow-2xl">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/30">
                <span className="material-symbols-outlined text-2xl">event_upcoming</span>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>Schedule Event Publication</h3>
                <p className="text-sm text-[#8c909f] leading-relaxed mb-4">
                  Please select the date when you want <span className="text-white font-semibold">{formData.title || "this event"}</span> to automatically publish.
                </p>
                
                <input 
                  type="datetime-local" 
                  name="scheduled_publish_date" 
                  value={formData.scheduled_publish_date} 
                  onChange={handleInputChange} 
                  required
                  className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white px-4 py-3 rounded-xl transition-all [color-scheme:dark]" 
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmSchedule}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}