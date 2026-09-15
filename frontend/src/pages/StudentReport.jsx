// src/pages/StudentReport.jsx

import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer
} from "recharts";

const API_URL = "http://localhost:8000";

const STATUS_COLORS = {
  Registered: "#4ade80",
  registered: "#4ade80",
  Cancelled: "#ffb4ab",
  cancelled: "#ffb4ab",
  Ended: "#8c909f",
  ended: "#8c909f"
};

const CHART_PALETTE = ["#adc6ff", "#ffb786", "#4ade80", "#f472b6", "#fde68a", "#a78bfa", "#38bdf8"];

const tooltipProps = {
  contentStyle: { backgroundColor: '#131b2e', borderColor: '#2d3449', borderRadius: '8px', padding: '10px' },
  itemStyle: { color: '#ffffff', fontSize: '13px', fontWeight: '600' },
  labelStyle: { color: '#ffffff', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }
};

function StatCard({ icon, label, value, accent, sub }) {
  return (
    <div 
      className="bg-[#131b2e] p-5 rounded-xl border-l-4 flex flex-col gap-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_5px_20px_rgba(0,0,0,0.3)] hover:brightness-110 cursor-pointer" 
      style={{ borderColor: accent }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-base" style={{ color: accent }}>{icon}</span>
        <p className="text-[#c2c6d6] text-[10px] font-bold uppercase tracking-widest">{label}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-[#dae2fd]">{value}</span>
        {sub && <span className="text-xs font-semibold" style={{ color: accent }}>{sub}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, icon, children, className = "" }) {
  return (
    <div className={`bg-[#131b2e] p-6 rounded-xl border border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-lg ${className}`}>
      <div className="flex items-center gap-2 mb-5">
        <span className="material-symbols-outlined text-[#adc6ff] text-lg">{icon}</span>
        <h3 className="text-[#dae2fd] font-bold text-sm tracking-wide">{title}</h3>
      </div>
      <div className="h-56">
        {children}
      </div>
    </div>
  );
}

export default function StudentReport() {
  const navigate = useNavigate();

  // -----------------------------
  // Profile & Notification States
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

  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search and Sort states
  const [tableSearch, setTableSearch] = useState("");
  const [startDateSort, setStartDateSort] = useState("none");
  const [endDateSort, setEndDateSort] = useState("none");
  const [formatSort, setFormatSort] = useState("none");

  const getToken = () => sessionStorage.getItem("token");
  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login", { replace: true }); // <--- Add { replace: true }
  };
  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "U");
  const getFirstName = (name) => (name ? name.trim().split(" ")[0] : "User");

  const fetchReportData = async () => {
    const token = getToken();
    if (!token) return navigate("/login");
    try {
      setLoading(true);
      setError("");
      
      const [userRes, eventsRes, regsRes] = await Promise.all([
        axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/events`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/my-registrations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      setUserName(userRes.data.name || "User");
      setUserEmail(userRes.data.email || "");
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
      const myRegs = regsRes.data || [];
      setEvents(allEvents);
      setRegistrations(myRegs);

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
      if (err.response?.status === 401) {
        handleLogout();
        return;
      }
      setError("Failed to load student activity records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
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

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "TBD";
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const enrichedRegistrations = useMemo(() => {
    return registrations
      .filter(reg => {
        const matchedEvent = events.find(e => e.id === reg.event_id) || {};
        return reg.status?.toLowerCase() !== 'cancelled' && matchedEvent.status !== 'cancelled';
      })
      .map(reg => {
        const matchedEvent = events.find(e => e.id === reg.event_id) || {};
        const ended = isEventEnded(matchedEvent);
        
        let computedStatus = "Active";
        if (ended) {
          computedStatus = "Event Ended";
        }

        return {
          ...reg,
          eventTitle: matchedEvent.title || "Unknown Event",
          category: matchedEvent.category || "Others",
          locationType: matchedEvent.location_type || "offline",
          location: matchedEvent.location_type === 'online' ? 'Online' : (matchedEvent.location || 'N/A'),
          dateFrom: matchedEvent.date_from,
          dateTo: matchedEvent.date_to,
          orgName: matchedEvent.organization_name || "N/A",
          contact: matchedEvent.contact || "N/A",
          format: matchedEvent.event_format || "individual",
          computedStatus,
          isEnded: ended
        };
      });
  }, [registrations, events]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    enrichedRegistrations.forEach(r => {
      const cat = r.category.toUpperCase();
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([label, value], i) => ({
      label, value, fill: CHART_PALETTE[i % CHART_PALETTE.length]
    }));
  }, [enrichedRegistrations]);

  const statusBreakdown = useMemo(() => {
    const map = {};
    enrichedRegistrations.forEach(r => {
      const st = r.computedStatus;
      map[st] = (map[st] || 0) + 1;
    });
    return Object.entries(map).map(([label, value]) => ({
      label, value, fill: STATUS_COLORS[label] || "#adc6ff"
    }));
  }, [enrichedRegistrations]);

  const formatBreakdown = useMemo(() => {
    const map = { individual: 0, team: 0 };
    enrichedRegistrations.forEach(r => {
      if (map[r.format] !== undefined) map[r.format]++;
    });
    return [
      { label: "Individual", value: map.individual, fill: "#38bdf8" },
      { label: "Team", value: map.team, fill: "#a78bfa" }
    ].filter(x => x.value > 0);
  }, [enrichedRegistrations]);

  // Filtered and sorted records for the table
  const filteredAndSortedTableRecords = useMemo(() => {
    const query = tableSearch.toLowerCase();
    return enrichedRegistrations
      .filter(r => 
        !query || 
        r.eventTitle.toLowerCase().includes(query) || 
        r.category.toLowerCase().includes(query) ||
        r.orgName.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        // Priority 1: Start Date Sort
        if (startDateSort === "newest") return new Date(b.dateFrom || 0) - new Date(a.dateFrom || 0);
        if (startDateSort === "oldest") return new Date(a.dateFrom || 0) - new Date(b.dateFrom || 0);
        
        // Priority 2: End Date Sort
        if (endDateSort === "newest") return new Date(b.dateTo || 0) - new Date(a.dateTo || 0);
        if (endDateSort === "oldest") return new Date(a.dateTo || 0) - new Date(b.dateTo || 0);
        
        // Priority 3: Format Sort
        if (formatSort === "individual") return a.format.localeCompare(b.format);
        if (formatSort === "team") return b.format.localeCompare(a.format);
        
        // Default Fallback
        return a.eventTitle.localeCompare(b.eventTitle);
      });
  }, [enrichedRegistrations, tableSearch, startDateSort, endDateSort, formatSort]);

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-nav { background: rgba(10, 15, 28, 0.7); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .glass-card { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2); }
        .glass-modal { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .glass-dropdown { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.5); }
        .bg-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px); }
        .recharts-default-tooltip { border-radius: 8px !important; border-color: #2d3449 !important; box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; }
        .recharts-tooltip-item-name, .recharts-tooltip-item-value, .recharts-tooltip-item-separator, .recharts-tooltip-label { color: #ffffff !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; }
      `}</style>

      <div className="min-h-screen bg-[#0b1326] text-[#dae2fd]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="fixed inset-0 z-0 bg-grid pointer-events-none"></div>

        {/* NAVBAR */}
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

        {/* MAIN CONTAINER */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#dae2fd] mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Student Activity Report</h1>
              <p className="text-[#c2c6d6] text-sm">Comprehensive performance analytics and participation history for {userName}.</p>
            </div>
            <button onClick={fetchReportData} className="flex items-center gap-2 bg-[#171f33] border border-white/10 text-[#adc6ff] px-4 py-2.5 rounded-xl font-bold hover:bg-[#222a3d] transition-all cursor-pointer">
              <span className="material-symbols-outlined text-lg">refresh</span> Refresh Data
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-blue-300 animate-spin" />
              <p className="text-[#c2c6d6] text-sm">Generating your activity report...</p>
            </div>
          ) : (
            <>
              {/* KPI STAT CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="event_available" label="Total Registrations" value={enrichedRegistrations.length} accent="#adc6ff" />
                <StatCard icon="check_circle" label="Active Events" value={enrichedRegistrations.filter(r => r.computedStatus === 'Active').length} accent="#4ade80" />
                <StatCard icon="category" label="Categories Explored" value={categoryBreakdown.length} accent="#ffb786" />
                <StatCard icon="groups" label="Team Participations" value={enrichedRegistrations.filter(r => r.format === 'team').length} accent="#a78bfa" />
              </div>

              {/* CHARTS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Registrations by Category" icon="donut_large">
                  {categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="label">
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip {...tooltipProps} />
                        <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#c2c6d6' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#424754] text-sm">No category data</div>
                  )}
                </ChartCard>

                <ChartCard title="Participation Format" icon="badge">
                  {formatBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3449" vertical={false} />
                        <XAxis dataKey="label" stroke="#8c909f" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#8c909f" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip {...tooltipProps} cursor={{fill: '#171f33'}} />
                        <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                          {formatBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#424754] text-sm">No format data</div>
                  )}
                </ChartCard>

                <ChartCard title="Registration Status" icon="verified">
                  {statusBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="label">
                          {statusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip {...tooltipProps} />
                        <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#c2c6d6' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#424754] text-sm">No status data</div>
                  )}
                </ChartCard>
              </div>

              {/* DETAILED LOG TABLE WITH ALL REQUESTED FIELDS */}
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                <div className="px-6 py-4 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5">
                  <div>
                    <h3 className="text-base font-bold text-white">Registered Events Log</h3>
                    <p className="text-xs text-[#8c909f]">Showing {filteredAndSortedTableRecords.length} of {enrichedRegistrations.length} records</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-48">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#8c909f]">
                        <span className="material-symbols-outlined text-base">search</span>
                      </span>
                      <input 
                        type="text"
                        placeholder="Search title, org..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-blue-500 text-white pl-9 pr-4 py-2 rounded-xl text-xs outline-none transition-all"
                      />
                    </div>

                    {/* Start Date Sort */}
                    <select
                      value={startDateSort}
                      onChange={(e) => {
                        setStartDateSort(e.target.value);
                        if (e.target.value !== "none") { setEndDateSort("none"); setFormatSort("none"); }
                      }}
                      className="w-full sm:w-auto bg-[#1e293b] border border-white/10 focus:border-blue-500 text-white px-3 py-2 rounded-xl text-xs outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value="none">Sort by Start Date</option>
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>

                    {/* End Date Sort */}
                    <select
                      value={endDateSort}
                      onChange={(e) => {
                        setEndDateSort(e.target.value);
                        if (e.target.value !== "none") { setStartDateSort("none"); setFormatSort("none"); }
                      }}
                      className="w-full sm:w-auto bg-[#1e293b] border border-white/10 focus:border-blue-500 text-white px-3 py-2 rounded-xl text-xs outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value="none">Sort by End Date</option>
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>

                    {/* Format Sort */}
                    <select
                      value={formatSort}
                      onChange={(e) => {
                        setFormatSort(e.target.value);
                        if (e.target.value !== "none") { setStartDateSort("none"); setEndDateSort("none"); }
                      }}
                      className="w-full sm:w-auto bg-[#1e293b] border border-white/10 focus:border-blue-500 text-white px-3 py-2 rounded-xl text-xs outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value="none">Sort by Format</option>
                      <option value="individual">Individual First</option>
                      <option value="team">Team First</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[#8c909f] text-[11px] uppercase tracking-wider">
                        <th className="p-4 font-semibold w-12">No.</th>
                        <th className="p-4 font-semibold">Event Title</th>
                        <th className="p-4 font-semibold">Category</th>
                        <th className="p-4 font-semibold">Format</th>
                        <th className="p-4 font-semibold">Org Name</th>
                        <th className="p-4 font-semibold">Start & End Date</th>
                        <th className="p-4 font-semibold">Location</th>
                        <th className="p-4 font-semibold">Contact Info</th>
                        <th className="p-4 font-semibold">Team Details</th>
                        <th className="p-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {filteredAndSortedTableRecords.length === 0 ? (
                        <tr><td colSpan="10" className="p-8 text-center text-[#8c909f]">No matching registration records found.</td></tr>
                      ) : (
                        filteredAndSortedTableRecords.map((r, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-mono text-xs text-[#8c909f]">{idx + 1}</td>
                            <td className="p-4 font-medium text-white">{r.eventTitle}</td>
                            <td className="p-4 capitalize text-[#dae2fd]">{r.category}</td>
                            <td className="p-4 capitalize text-[#dae2fd]">{r.format}</td>
                            <td className="p-4 text-xs text-white">{r.orgName}</td>
                            <td className="p-4 text-xs text-[#8c909f]">
                              {formatDateDisplay(r.dateFrom)} {r.dateTo ? `to ${formatDateDisplay(r.dateTo)}` : ''}
                            </td>
                            <td className="p-4 text-xs text-[#dae2fd]">{r.location}</td>
                            <td className="p-4 text-xs text-[#8c909f]">{r.contact}</td>
                            <td className="p-4 text-xs text-[#8c909f]">
                              {r.team_leader ? `Leader: ${r.team_leader}` : "Individual"}
                              {r.team_members && <span className="block text-[11px]">Members: {r.team_members}</span>}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                                r.computedStatus === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                                'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                              }`}>
                                {r.computedStatus.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
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
      </div>
    </>
  );
}