import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchAnalytics } from "./adminApi";
import { CATEGORY_COLORS } from "../constants/categoryColors";

export default function AnalyticsDashboard() {
  const { t } = useTranslation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(function () {
    fetchAnalytics()
      .then(setData)
      .catch(function (err) { setError(err.message); })
      .finally(function () { setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="adm-analytics-grid">
        {[1, 2, 3].map(function (i) {
          return (
            <div key={i} className="adm-analytics-card">
              <div className="adm-skeleton" style={{ height: "16px", width: "160px", marginBottom: "18px" }} />
              <div className="adm-skeleton" style={{ height: "260px", width: "100%" }} />
            </div>
          );
        })}
      </div>
    );
  }

  if (error) {
    return (
      <p style={{ color: "var(--coral)", fontSize: "14px", padding: "20px 0" }}>
        ⚠ {error}
      </p>
    );
  }

  if (!data) return null;

  const tooltipStyle = {
    backgroundColor: "var(--adm-surface)",
    border: "1px solid var(--adm-border)",
    borderRadius: "8px",
    fontSize: "13px",
    color: "var(--adm-text-h)",
  };

  const tooltipItemStyle = { color: "var(--adm-text-h)" };
  const tooltipLabelStyle = { color: "var(--adm-text-h)", fontWeight: 600, marginBottom: "4px" };

  return (
    <div className="adm-analytics-grid">

      {/* Chart 1: Category breakdown — full width */}
      <section className="adm-analytics-card">
        <h3>{t("admin_chart_category")}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.category_breakdown} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" />
            <XAxis dataKey="category" tick={{ fill: "var(--adm-text)", fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--adm-text)", fontSize: 12 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
            />
            <Bar dataKey="count" radius={[5, 5, 0, 0]}>
              {data.category_breakdown.map(function (entry) {
                return (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Chart 2: 30-day trend */}
      <section className="adm-analytics-card">
        <h3>{t("admin_chart_trend")}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.weekly_trend} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" />
            <XAxis dataKey="report_date" tick={{ fill: "var(--adm-text)", fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--adm-text)", fontSize: 12 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--indigo-2)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Chart 3: Top 10 areas */}
      <section className="adm-analytics-card">
        <h3>{t("admin_chart_areas")}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data.area_breakdown}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 40, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--adm-border)" />
            <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--adm-text)", fontSize: 12 }} />
            <YAxis dataKey="area_name" type="category" width={100} tick={{ fill: "var(--adm-text)", fontSize: 12 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
            />
            <Bar dataKey="count" fill="var(--slate)" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

    </div>
  );
}
