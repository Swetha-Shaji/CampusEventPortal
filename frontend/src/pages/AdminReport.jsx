// src/pages/AdminReport.jsx

import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer
} from "recharts";

const API_URL = "http://localhost:8000";

const C = {
  bg: "#080D18", surface: "#0F1827", s2: "#162033", border: "#1D2C45", 
  primary: "#3D8EFF", cyan: "#00DBC8", amber: "#FFB02E", red: "#FF5252", 
  purple: "#9B7AFF", green: "#2ED88A", text: "#DDE4F0", muted: "#5B7099",
  chart: ["#3D8EFF","#00DBC8","#FFB02E","#9B7AFF","#2ED88A","#FF5252"],
};

const tt = {
  contentStyle: { background: C.s2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text, padding: "8px 12px" },
  labelStyle: { color: C.muted, marginBottom: 4 },
  itemStyle: { color: C.text },
};

const syne = { fontFamily: "'Syne', sans-serif" };

const STATUS_COLORS = {
  Registered: "#2ED88A",
  Cancelled: "#FF5252",
  Active: "#3D8EFF",
  Scheduled: "#00DBC8",
  Draft: "#FFB02E",
  Offline: "#3D8EFF",
  Online: "#FFB02E"
};

function StatCard({ icon, label, value, accent, sub }) {
  return (
    <div 
      style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, 
        padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6, 
        borderLeft: `4px solid ${accent}`
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{label}</p>
        <span className="material-symbols-outlined" style={{ color: accent, fontSize: 18 }}>{icon}</span>
      </div>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: accent, margin: 0, fontWeight: 600 }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon, children, height = 260 }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ color: C.primary, fontSize: 18 }}>{icon}</span>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.09em", margin: 0 }}>{title}</p>
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

export default function AdminReport() {
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

  const [eventRecords, setEventRecords] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const fetchAdminReportData = async () => {
    const token = getToken();
    if (!token) return navigate("/admin-login");
    try {
      setLoading(true);
      const [eventsRes, partsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/event-records`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/admin/participants`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      setEventRecords(eventsRes.data || []);
      setParticipants(partsRes.data || []);
    } catch (err) {
      setError("Failed to load platform analytics records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchAdminReportData();
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

  const activeParticipants = useMemo(() => {
    return participants.filter(p => p.reg_status?.toLowerCase() !== "cancelled");
  }, [participants]);

  const totalRegistrationsCount = useMemo(() => {
    return activeParticipants.length;
  }, [activeParticipants]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    eventRecords.forEach(ev => {
      const cat = ev.category ? ev.category.toUpperCase() : "OTHERS";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([label, value], i) => ({
      label, value, fill: C.chart[i % C.chart.length]
    }));
  }, [eventRecords]);

  const eventStatusBreakdown = useMemo(() => {
    const map = {};
    eventRecords.forEach(ev => {
      const st = ev.status ? ev.status.charAt(0).toUpperCase() + ev.status.slice(1) : "Active";
      map[st] = (map[st] || 0) + 1;
    });
    return Object.entries(map).map(([label, value]) => ({
      label, value, fill: STATUS_COLORS[label] || C.primary
    }));
  }, [eventRecords]);

  const participantStatusBreakdown = useMemo(() => {
    const map = {};
    participants.forEach(p => {
      const st = p.reg_status || "Registered";
      map[st] = (map[st] || 0) + 1;
    });
    return Object.entries(map).map(([label, value]) => ({
      label, value, fill: STATUS_COLORS[label] || C.primary
    }));
  }, [participants]);

  const last7DaysActivity = useMemo(() => {
    const map = {};
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const displayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      map[dateStr] = { 
        label: displayLabel, 
        activeRegistrations: 0, 
        cancelledRegistrations: 0,
        createdEvents: 0,
        cancelledEvents: 0 
      };
      result.push(dateStr);
    }

    // Use full participants array to get both active and cancelled
    participants.forEach(p => {
      if (p.registered_at) {
        const regDateStr = p.registered_at.toString().substring(0, 10);
        if (map[regDateStr]) {
          if (p.reg_status?.toLowerCase() === "cancelled") {
            map[regDateStr].cancelledRegistrations++;
          } else {
            map[regDateStr].activeRegistrations++;
          }
        }
      }
    });

    eventRecords.forEach(ev => {
      if (ev.created_at) {
        const evDateStr = ev.created_at.toString().substring(0, 10);
        if (map[evDateStr]) {
          const status = ev.status?.toLowerCase() || "";
          if (status === "cancelled") {
            map[evDateStr].cancelledEvents++;
          } else if (["draft", "scheduled", "active"].includes(status) || !status) {
            map[evDateStr].createdEvents++;
          }
        }
      }
    });

    return result.map(dateStr => map[dateStr]);
  }, [participants, eventRecords]);

  const registrationsPerEventData = useMemo(() => {
    const countsMap = {};
    activeParticipants.forEach(p => {
      const title = p.event_title || "Unknown Event";
      countsMap[title] = (countsMap[title] || 0) + 1;
    });

    return eventRecords.map(ev => ({
      title: ev.title.length > 18 ? ev.title.substring(0, 15) + "..." : ev.title,
      fullTitle: ev.title,
      registrations: countsMap[ev.title] || 0
    }));
  }, [eventRecords, activeParticipants]);

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-nav { background: rgba(10, 15, 28, 0.7); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .glass-modal { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .bg-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .recharts-default-tooltip { border-radius: 8px !important; border-color: ${C.border} !important; box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; }
        .recharts-tooltip-item-name, .recharts-tooltip-item-value, .recharts-tooltip-item-separator, .recharts-tooltip-label { color: ${C.text} !important; }
      `}</style>

      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }} className="relative">
        <div className="fixed inset-0 z-0 bg-grid pointer-events-none"></div>

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
                Admin Report
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

        {/* MAIN CONTAINER */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-6">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 style={{ ...syne, fontSize: 26, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>Platform Analytics & Reports</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}></p>
            </div>
            <button onClick={fetchAdminReportData} style={{ padding: "10px 18px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.primary, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span> Refresh Data
            </button>
          </div>

          {error && (
            <div style={{ padding: "12px 16px", background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33`, borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <p style={{ color: C.muted, fontSize: 13 }}>Loading analytics engine...</p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {/* KPI STAT CARDS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                <StatCard icon="event" label="Total Events Created" value={eventRecords.length} accent={C.primary} />
                <StatCard icon="groups" label="Total Active Registrations" value={totalRegistrationsCount} accent={C.green} />
                <StatCard icon="category" label="Active Categories" value={categoryBreakdown.length} accent={C.amber} />
              </div>

              {/* TWO LINE GRAPHS SECTION */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                
                {/* 1. Line Graph: Last 7 Days Activity */}
                <ChartCard title="Activity Trend (Last 7 Days)" icon="show_chart" height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last7DaysActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="label" stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={45} />
                      <YAxis stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip {...tt} />
                      <RechartsLegend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.muted }} />
                      
                      <Line type="monotone" dataKey="activeRegistrations" name="Active Registrations" stroke={C.green} strokeWidth={3} dot={{ fill: C.green, r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="cancelledRegistrations" name="Cancelled Registrations" stroke={C.red} strokeWidth={3} dot={{ fill: C.red, r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="createdEvents" name="Created Events" stroke={C.primary} strokeWidth={3} dot={{ fill: C.primary, r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="cancelledEvents" name="Cancelled Events" stroke={C.amber} strokeWidth={3} dot={{ fill: C.amber, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* 2. Line Graph: Registrations Per Event (Excluding Cancelled) */}
                <ChartCard title="Registrations Per Event" icon="trending_up" height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={registrationsPerEventData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="title" stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={45} />
                      <YAxis stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip {...tt} formatter={(val, name, item) => [val, item.payload.fullTitle]} />
                      <RechartsLegend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.muted }} />
                      <Line type="monotone" dataKey="registrations" name="Active Signups" stroke={C.amber} strokeWidth={3} dot={{ fill: C.amber, r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

              </div>

              {/* CHARTS GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                <ChartCard title="Events by Category" icon="donut_large" height={220}>
                  {categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" nameKey="label">
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip {...tt} />
                        <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '10px', color: C.muted }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontSize: 12 }}>No category data</div>
                  )}
                </ChartCard>

                <ChartCard title="Event Lifecycle Status" icon="track_changes" height={220}>
                  {eventStatusBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventStatusBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                        <XAxis dataKey="label" stroke={C.muted} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke={C.muted} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip {...tt} cursor={{ fill: C.s2 }} />
                        <Bar dataKey="value" name="Events" radius={[4, 4, 0, 0]}>
                          {eventStatusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontSize: 12 }}>No status data</div>
                  )}
                </ChartCard>

                <ChartCard title="Participant Status" icon="verified" height={220}>
                  {participantStatusBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={participantStatusBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" nameKey="label">
                          {participantStatusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip {...tt} />
                        <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '10px', color: C.muted }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontSize: 12 }}>No participant data</div>
                  )}
                </ChartCard>
              </div>
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
                      className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50 outline-none" 
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
                      className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50 outline-none" 
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
                          className="w-full bg-[#1e293b]/50 border border-white/10 focus:border-red-500 text-white px-4 py-3.5 rounded-xl transition-all disabled:opacity-50 outline-none" 
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
                      className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 cursor-pointer"
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