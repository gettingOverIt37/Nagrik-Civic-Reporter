import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchIssues } from "../services/api";
import { CATEGORY_COLORS } from "../constants/categoryColors";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

function createColoredIcon(color) {
  return L.divIcon({
    className: "custom-marker",
    html:
      '<div style="background-color:' +
      color +
      '; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Leaflet caches its container size at init time. Since this map now lives
// inside a panel that animates from 0 -> 400px wide, we nudge it to
// re-measure once the CSS width transition finishes (350ms, see App.css).
function MapResizeHandler({ isOpen }) {
  const map = useMap();
  useEffect(
    function () {
      if (!isOpen) return;
      // Turant ek baar invalidate karo (initial mount ke liye)
      map.invalidateSize();
      // Aur width transition (0.35s) khatam hone ke baad dobara,
      // taaki final size sahi se pick ho
      const timer = setTimeout(function () {
        map.invalidateSize();
      }, 380);

      function handleResize() { map.invalidateSize(); }
      window.addEventListener("resize", handleResize);

      return function () {
        clearTimeout(timer);
        window.removeEventListener("resize", handleResize);
      };
    },
    [isOpen, map]
  );
  return null;
}

function ClusterLayer({ issues }) {
  const map = useMap();

  useEffect(function () {
    const cluster = L.markerClusterGroup();

    issues.forEach(function (issue) {
      const color = CATEGORY_COLORS[issue.category] || CATEGORY_COLORS.other;
      const marker = L.marker(
        [issue.latitude, issue.longitude],
        { icon: createColoredIcon(color) }
      );
      marker.bindPopup(
        "<b>" + issue.category + "</b><br/>" +
        issue.description + "<br/>Status: " + issue.status
      );
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    return function () { map.removeLayer(cluster); };
  }, [issues, map]);

  return null;
}

export default function MapView({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const [issues, setIssues] = useState([]);

  // Stage 12 Hissa 3 — Display Translation:
  // Jab bhi language badlegi (i18n.language change hoga), backend se
  // naye translated descriptions fetch honge. DB mein English stored hai;
  // backend on-the-fly translate karke deta hai — DB ko chhue bina.
  useEffect(
    function () {
      fetchIssues(i18n.language)
        .then(function (result) {
          if (Array.isArray(result)) {
            setIssues(result);
          } else {
            console.error("Expected array from /issues, got:", result);
            setIssues([]);
          }
        })
        .catch(function (err) {
          console.error("Failed to fetch issues:", err);
          setIssues([]);
        });
    },
    [i18n.language] // har language switch pe re-fetch
  );

  return (
    <div className={"map-panel" + (isOpen ? " open" : "")}>
      <div className="map-panel-head">
        <h3>{t("map_title")}</h3>
        <button className="map-close-btn" onClick={onClose} aria-label="Close map">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="map-panel-body">
        {isOpen && (
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapResizeHandler isOpen={isOpen} />
            <ClusterLayer issues={issues} />
          </MapContainer>
        )}

        {isOpen && issues.length === 0 && (
          <p className="map-empty-overlay">{t("map_empty")}</p>
        )}
      </div>
    </div>
  );
}
