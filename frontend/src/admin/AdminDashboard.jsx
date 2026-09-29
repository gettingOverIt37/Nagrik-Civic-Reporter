import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    fetchAdminIssues, updateIssueStatus,
    fetchAdminStats, generateInvite, clearToken,
    BASE_URL,
} from "./adminApi";
import AnalyticsDashboard from "./AnalyticsDashboard";
import WeeklySummaryCard from "./WeeklySummaryCard";
import AdminThemeToggle from "./AdminThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./AdminDashboard.css";
// STATUS_COLORS — semantic, intentionally fixed (not theme-aware)
const STATUS_COLORS = {
    reported: { bg: "#FFF3E0", color: "#E65100" },
    acknowledged: { bg: "#E3F2FD", color: "#1565C0" },
    resolved: { bg: "#E8F5E9", color: "#2E7D32" },
};

// CATEGORY_COLORS — synced with categoryColors.js (City Pulse palette)
const CATEGORY_COLORS = {
    pothole: "#FF5D73",
    garbage: "#453C9E",
    streetlight: "#FF8A3D",
    drainage: "#2BA9A0",
    water_leakage: "#3E7BFA",
    stray_animals: "#C9822E",
    other: "#6B6B8A",
};

function getSeverityStyle(sev) {
    if (sev >= 5) return { bg: "#ffebee", color: "#b71c1c" };
    if (sev >= 4) return { bg: "#ffebee", color: "#c62828" };
    if (sev >= 3) return { bg: "#fff3e0", color: "#e65100" };
    return { bg: "var(--adm-surface-2)", color: "var(--adm-text)" };
}

// Nav keys — labels filled inside component using t()
const NAV_KEYS = [
    {
        key: "issues",
        tKey: "admin_issues",
        icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
        ),
    },
    {
        key: "analytics",
        tKey: "admin_analytics",
        icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 17V13M12 17V9M16 17V12" />
            </svg>
        ),
    },
    {
        key: "weekly",
        tKey: "admin_weekly",
        icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 3" />
            </svg>
        ),
    },
    {
        key: "invite",
        tKey: "admin_invite",
        icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
            </svg>
        ),
    },
];

function timeAgo(dateStr, lang) {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units = [
    { unit: "year",   seconds: 31536000 },
    { unit: "month",  seconds: 2592000  },
    { unit: "week",   seconds: 604800   },
    { unit: "day",    seconds: 86400    },
    { unit: "hour",   seconds: 3600     },
    { unit: "minute", seconds: 60       },
    { unit: "second", seconds: 1        },
  ];
  for (const { unit, seconds: s } of units) {
    const delta = Math.floor(seconds / s);
    if (delta >= 1) {
      try {
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
        return rtf.format(-delta, unit);
      } catch {
        return `${delta} ${unit}${delta > 1 ? "s" : ""} ago`;
      }
    }
  }
  return "just now";
}

export default function AdminDashboard({ username, onLogout }) {
    const { t, i18n } = useTranslation();
    const [issues, setIssues] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inviteCode, setInviteCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("issues");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [modalIssue, setModalIssue] = useState(null);

    const loadData = useCallback(async function () {
        setLoading(true);
        const [issuesData, statsData] = await Promise.all([
            fetchAdminIssues(i18n.language),
            fetchAdminStats(),
        ]);
        setIssues(Array.isArray(issuesData) ? issuesData : []);
        setStats(statsData);
        setLoading(false);
    }, [i18n.language]);

    useEffect(function () { loadData(); }, [loadData]);

    async function handleStatusChange(issueId, newStatus) {
        setIssues(function (prev) {
            return prev.map(function (issue) {
                return issue.id === issueId ? { ...issue, status: newStatus } : issue;
            });
        });
        const result = await updateIssueStatus(issueId, newStatus);
        if (result.detail) {
            loadData();
        } else {
            const { fetchAdminStats: getStats } = await import("./adminApi");
            const statsData = await getStats();
            setStats(statsData);
        }
    }

    async function handleGenerateInvite() {
        const result = await generateInvite();
        if (result.invite_code) {
            setInviteCode(result.invite_code);
            setCopied(false);
        }
    }

    function handleCopyInvite() {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(function () { setCopied(false); }, 2000);
    }

    function handleLogout() {
        clearToken();
        onLogout();
    }

    const filteredIssues = issues.filter(function (issue) {
        const matchStatus = statusFilter === "all" || issue.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchSearch = !q ||
            (issue.description || "").toLowerCase().includes(q) ||
            (issue.category || "").toLowerCase().includes(q) ||
            (issue.area_name || "").toLowerCase().includes(q) ||
            String(issue.id).includes(q);
        return matchStatus && matchSearch;
    });

    const userInitial = (username || "A")[0].toUpperCase();

    const PAGE_TITLES = {
        issues: t("admin_issues"),
        analytics: t("admin_analytics"),
        weekly: t("admin_weekly"),
        invite: t("admin_invite"),
    };

    const TABLE_HEADERS = [
        "#",
        t("admin_col_photo"),
        t("admin_col_category"),
        t("admin_col_description"),
        t("admin_col_area"),
        t("admin_col_severity"),
        t("admin_col_confidence"),
        t("admin_col_date"),
        t("admin_col_status"),
    ];

    return (
        <div className="adm-shell">

            {/* ── Sidebar ── */}
            <aside className={"adm-sidebar" + (sidebarCollapsed ? " collapsed" : "")}>
                <div className="adm-sidebar-logo">
                    <div className="adm-sidebar-logo-mark">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="13" r="4" />
                            <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0120 20.5H4A1.5 1.5 0 012.5 19v-9A1.5 1.5 0 014 8.5z" />
                        </svg>
                    </div>
                    <span className="adm-sidebar-logo-text">Nagrik Admin</span>
                </div>

                <nav className="adm-sidebar-nav">
                    {NAV_KEYS.map(function (item) {
                        return (
                            <button
                                key={item.key}
                                className={"adm-nav-item" + (activeTab === item.key ? " active" : "")}
                                onClick={function () { setActiveTab(item.key); }}
                                title={sidebarCollapsed ? t(item.tKey) : undefined}
                            >
                                {item.icon}
                                <span className="adm-nav-label">{t(item.tKey)}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="adm-sidebar-bottom">
                    <button
                        className="adm-collapse-btn"
                        onClick={function () { setSidebarCollapsed(function (c) { return !c; }); }}
                        title={t("admin_collapse")}
                    >
                        <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.25s", transform: sidebarCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        <span className="adm-nav-label">{t("admin_collapse")}</span>
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <div className="adm-main">

                {/* Topbar */}
                <header className="adm-topbar">
                    <div className="adm-topbar-left">
                        <p className="adm-page-title">{PAGE_TITLES[activeTab]}</p>
                        {activeTab === "issues" && stats && (
                            <span style={{ fontSize: "12px", color: "var(--adm-text)", marginLeft: "4px" }}>
                                — {filteredIssues.length} {t("admin_showing")}
                            </span>
                        )}
                    </div>

                    <div className="adm-topbar-right">
                        <LanguageSwitcher />
                        <AdminThemeToggle />

                        <div className="adm-user-chip">
                            <div className="adm-user-avatar">{userInitial}</div>
                            <span className="adm-user-name">{username}</span>
                        </div>

                        <button className="adm-logout-btn" onClick={handleLogout}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                            </svg>
                            {t("admin_logout")}
                        </button>
                    </div>
                </header>

                {/* Body */}
                <main className="adm-body">

                    {/* Stat cards */}
                    {(activeTab === "issues" || activeTab === "analytics") && stats && (
                        <div className="adm-stats-grid">
                            {[
                                { tKey: "admin_total", value: stats.total, color: "#453C9E" },
                                { tKey: "admin_filter_reported", value: stats.pending ?? stats.reported, color: "#E65100" },
                                { tKey: "admin_filter_acknowledged", value: stats.acknowledged, color: "#1565C0" },
                                { tKey: "admin_filter_resolved", value: stats.resolved, color: "#2BA9A0" },
                            ].map(function (card) {
                                return (
                                    <div
                                        key={card.tKey}
                                        className="adm-stat-card"
                                        style={{ "--stat-color": card.color }}
                                    >
                                        <p className="adm-stat-label">{t(card.tKey)}</p>
                                        <p className="adm-stat-value">{card.value ?? "—"}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── ISSUES TAB ── */}
                    {activeTab === "issues" && (
                        <>
                            <div className="adm-toolbar">
                                <div className="adm-search-wrap">
                                    <svg className="adm-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                                    </svg>
                                    <input
                                        className="adm-search-input"
                                        type="text"
                                        placeholder={t("admin_search_placeholder")}
                                        value={searchQuery}
                                        onChange={function (e) { setSearchQuery(e.target.value); }}
                                    />
                                </div>

                                <div className="adm-filter-pills">
                                    {["all", "reported", "acknowledged", "resolved"].map(function (f) {
                                        return (
                                            <button
                                                key={f}
                                                className={"adm-pill" + (statusFilter === f ? " active" : "")}
                                                onClick={function () { setStatusFilter(f); }}
                                            >
                                                {t(f === "all" ? "admin_filter_all" : `admin_filter_${f}`)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {loading ? (
                                <div className="adm-table-wrap">
                                    {[1, 2, 3, 4, 5].map(function (i) {
                                        return (
                                            <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--adm-border)" }}>
                                                <div className="adm-skeleton" style={{ height: "14px", width: i % 2 === 0 ? "60%" : "80%" }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : filteredIssues.length === 0 ? (
                                <div className="adm-empty">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                                    </svg>
                                    <p>{searchQuery ? t("admin_no_search") : t("admin_no_issues")}</p>
                                </div>
                            ) : (
                                <div className="adm-table-wrap">
                                    <div className="adm-table-scroll">
                                        <table className="adm-table">
                                            <thead>
                                                <tr>
                                                    {TABLE_HEADERS.map(function (h) {
                                                        return <th key={h}>{h}</th>;
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredIssues.map(function (issue) {
                                                    const catColor = CATEGORY_COLORS[issue.category] || "#6B6B8A";
                                                    const statusStyle = STATUS_COLORS[issue.status] || STATUS_COLORS.reported;
                                                    const sevStyle = getSeverityStyle(issue.severity);
                                                    const imgUrl = issue.photo_filename
                                                        ? `${BASE_URL}/uploads/${issue.photo_filename}`
                                                        : null;

                                                    return (
                                                        <tr key={issue.id}>
                                                            <td style={{ color: "var(--adm-text)", fontVariantNumeric: "tabular-nums" }}>
                                                                #{issue.id}
                                                            </td>

                                                            <td>
                                                                {imgUrl ? (
                                                                    <img
                                                                        src={imgUrl}
                                                                        alt={t("admin_col_photo")}
                                                                        className="adm-img-thumb"
                                                                        loading="lazy"
                                                                        onClick={function () { setModalIssue(issue); }}
                                                                    />
                                                                ) : (
                                                                    <div className="adm-no-img">
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                                                            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9l4-4 4 4 4-4 4 4" /><circle cx="8.5" cy="14.5" r="1.5" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className="adm-cat-badge"
                                                                    style={{ background: catColor + "1A", color: catColor }}
                                                                >
                                                                    {t("category_" + issue.category)}
                                                                </span>
                                                            </td>

                                                            <td style={{ maxWidth: "240px" }}>
                                                                <p className="adm-desc-main">{issue.description}</p>
                                                                {issue.language_code && issue.language_code !== "en" && (
                                                                    <p className="adm-desc-orig">
                                                                        ({issue.language_code}): {issue.description_original}
                                                                    </p>
                                                                )}
                                                            </td>

                                                            <td style={{ whiteSpace: "nowrap", color: "var(--adm-text)" }}>
                                                                {issue.area_name || "—"}
                                                            </td>

                                                            <td>
                                                                <span className="adm-sev-badge" style={{ background: sevStyle.bg, color: sevStyle.color }}>
                                                                    {issue.severity}/5
                                                                </span>
                                                            </td>

                                                            <td>
                                                                {issue.ai_confidence
                                                                    ? `${Math.round(issue.ai_confidence * 100)}%`
                                                                    : "—"}
                                                                {issue.is_likely_genuine === false && (
                                                                    <span className="adm-flagged">{t("admin_flagged")}</span>
                                                                )}
                                                            </td>

                                                            <td style={{ whiteSpace: "nowrap", color: "var(--adm-text)", fontSize: "12px" }}>
                                                                {timeAgo(issue.reported_at, i18n.language)}
                                                            </td>

                                                            <td>
                                                                <select
                                                                    className="adm-status-select"
                                                                    value={issue.status}
                                                                    onChange={function (e) { handleStatusChange(issue.id, e.target.value); }}
                                                                    style={{
                                                                        border: `1.5px solid ${statusStyle.color}`,
                                                                        background: statusStyle.bg,
                                                                        color: statusStyle.color,
                                                                    }}
                                                                >
                                                                    <option value="reported">{t("admin_filter_reported")}</option>
                                                                    <option value="acknowledged">{t("admin_filter_acknowledged")}</option>
                                                                    <option value="resolved">{t("admin_filter_resolved")}</option>
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── ANALYTICS TAB ── */}
                    {activeTab === "analytics" && <AnalyticsDashboard />}

                    {/* ── WEEKLY AI TAB ── */}
                    {activeTab === "weekly" && <WeeklySummaryCard />}

                    {/* ── INVITE TAB ── */}
                    {activeTab === "invite" && (
                        <div style={{ maxWidth: "560px" }}>
                            <div className="adm-weekly-card" style={{ borderLeftColor: "var(--indigo-2)" }}>
                                <div className="adm-weekly-header">
                                    <h3 className="adm-weekly-title">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
                                        </svg>
                                        {t("admin_invite_title")}
                                    </h3>
                                    <button className="adm-invite-btn" onClick={handleGenerateInvite}>
                                        {t("admin_invite_new")}
                                    </button>
                                </div>
                                <p className="adm-weekly-text">{t("admin_invite_desc")}</p>

                                {inviteCode && (
                                    <div className="adm-invite-banner" style={{ marginBottom: 0, marginTop: "8px" }}>
                                        <span className="adm-invite-label">{t("admin_invite_label")}</span>
                                        <code className="adm-invite-code">{inviteCode}</code>
                                        <button className="adm-invite-copy" onClick={handleCopyInvite}>
                                            {copied ? t("admin_invite_copied") : t("admin_invite_copy")}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </main>
            </div>

            {/* ── Image preview modal ── */}
            {modalIssue && (
                <div
                    className="adm-modal-backdrop"
                    onClick={function (e) {
                        if (e.target === e.currentTarget) setModalIssue(null);
                    }}
                >
                    <div className="adm-modal-box">
                        <div className="adm-modal-head">
                            <h3 className="adm-modal-title">
                                #{modalIssue.id} — {modalIssue.category.replace("_", " ")}
                            </h3>
                            <button className="adm-modal-close" onClick={function () { setModalIssue(null); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {modalIssue.photo_filename && (
                            <img
                                src={`${BASE_URL}/uploads/${modalIssue.photo_filename}`}
                                alt={t("admin_col_photo")}
                                className="adm-modal-img"
                            />
                        )}

                        <div className="adm-modal-meta">
                            <div className="adm-modal-meta-item">
                                <strong>{t("admin_col_description")}</strong>
                                {modalIssue.description}
                            </div>
                            <div className="adm-modal-meta-item">
                                <strong>{t("admin_col_area")}</strong>
                                {modalIssue.area_name || "—"}
                                {modalIssue.latitude && modalIssue.longitude && (
                                    <a
                                        href={`https://www.google.com/maps?q=${modalIssue.latitude},${modalIssue.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: "inline-block",
                                            marginTop: "6px",
                                            fontSize: "12px",
                                            color: "var(--adm-accent)",
                                            textDecoration: "none",
                                            border: "1px solid var(--adm-accent)",
                                            borderRadius: "6px",
                                            padding: "3px 8px",
                                        }}
                                    >
                                        📍 Open in Google Maps
                                    </a>
                                )}
                            </div>
                            <div className="adm-modal-meta-item">
                                <strong>{t("admin_col_severity")}</strong>
                                {modalIssue.severity}/5
                            </div>
                            <div className="adm-modal-meta-item">
                                <strong>{t("admin_col_date")}</strong>
                                {modalIssue.reported_at}
                            </div>
                            {modalIssue.ai_confidence && (
                                <div className="adm-modal-meta-item">
                                    <strong>{t("admin_col_confidence")}</strong>
                                    {Math.round(modalIssue.ai_confidence * 100)}%
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }

        </div >
    );
}
