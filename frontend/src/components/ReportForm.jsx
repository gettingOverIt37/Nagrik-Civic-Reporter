import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { analyzePhoto, submitReport } from "../services/api";
import { CATEGORY_COLORS } from "../constants/categoryColors";
import CategoryIcon from "../constants/categoryIcons";
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
const CATEGORIES = [
  "pothole", "garbage", "streetlight",
  "drainage", "water_leakage", "stray_animals", "other"
];

const LOADING_STEPS = [
  "Scanning photo...",
  "Detecting category...",
  "Generating description...",
  "Assessing severity...",
];

const SEVERITY_META = [
  { label: "Low", color: "#2BA9A0" },
  { label: "Minor", color: "#3E7BFA" },
  { label: "Medium", color: "#FF8A3D" },
  { label: "High", color: "#FF5D73" },
  { label: "Critical", color: "#C81E3A" },
];

function IconUpload(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  );
}
function IconCamera(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <circle cx="12" cy="13.5" r="3.4" />
      <path d="M8 7l1.4-2.6h5.2L16 7" />
    </svg>
  );
}
function IconCheck(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconX(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function IconWarning(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4M12 17.5v.01" />
    </svg>
  );
}
function IconSparkle(props) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2l1.8 5.6L19.4 9.4 13.8 11.2 12 16.8 10.2 11.2 4.6 9.4 10.2 7.6z" />
    </svg>
  );
}

function LocationClickCatcher({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(function () {
    if (target) map.flyTo([target.lat, target.lng], 16);
  }, [target, map]);
  return null;
}

export default function ReportForm() {
  const { t, i18n } = useTranslation();
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState(3);
  const [isLikelyGenuine, setIsLikelyGenuine] = useState(true);
  const [aiConfidence, setAiConfidence] = useState(null);
  const [confirmationSummary, setConfirmationSummary] = useState("");
  const [wasEdited, setWasEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [location, setLocation] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const [submittedId, setSubmittedId] = useState(null);
  const [exifLocation, setExifLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [manualLocation, setManualLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationArea, setLocationArea] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFlyTo, setSearchFlyTo] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(function () { setToast(null); }, 3500);
  }

  async function handleLocationSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=in`
      );
      const results = await res.json();
      if (results.length > 0) {
        setSearchFlyTo({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
      } else {
        showToast("Location not found — try a different search.", "warning");
      }
    } catch {
      showToast("Search failed — check your connection.", "warning");
    }
  }

  // Reverse geocode — coordinates se area name nikalo. Component-level function
  // hai taaki photo upload aur manual map-pin, dono use kar sakein.
  async function getAreaName(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      return data.address?.suburb ||
        data.address?.neighbourhood ||
        data.address?.city_district ||
        data.address?.town ||
        data.address?.city ||
        data.address?.state ||
        "Unknown area";
    } catch {
      return "Unknown area";
    }
  }

  async function processFile(file) {
    if (!file) return;
    // Compress if image is larger than 1MB
    if (file.size > 1024 * 1024) {
      file = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
    }

    try {
      const exifData = await exifr.gps(file);
      if (exifData && exifData.latitude && exifData.longitude) {
        setExifLocation({ lat: exifData.latitude, lng: exifData.longitude });
        const area = await getAreaName(exifData.latitude, exifData.longitude);
        setLocationLabel(`📍 ${area} (from photo)`);
        setLocationArea(area);
      } else {
        setExifLocation(null);
        setLocationLabel("📍 Detecting your location...");
      }
    } catch {
      setExifLocation(null);
      setLocationLabel("📍 Detecting your location...");
    }

    setPhoto(file);

    // Reverse geocode — coordinates se area name nikalo
    async function getAreaName(lat, lng) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await res.json();
        return data.address?.suburb ||
          data.address?.neighbourhood ||
          data.address?.city_district ||
          data.address?.town ||
          data.address?.city ||
          data.address?.state ||
          "Unknown area";
      } catch {
        return "Unknown area";
      }
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setLoading(true);
    setLoadingStep(0);

    let step = 0;
    const stepInterval = setInterval(function () {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadingStep(step);
    }, 800);

    navigator.geolocation.getCurrentPosition(
      async function (position) {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        const area = await getAreaName(latitude, longitude);
        setLocationLabel(`📍 ${area}`);
        setLocationArea(area);
      },
      function (error) {
        console.error("Location error:", error);
        showToast("Location unavailable — please enable location access.", "warning");
        setLocationLabel("📍 Location unavailable");
      }
    );

    const result = await analyzePhoto(file, i18n.language);
    clearInterval(stepInterval);
    setCategory(result.category);
    setDescription(result.description);
    setSeverity(result.severity);
    setIsLikelyGenuine(result.is_likely_genuine);
    setAiConfidence(result.ai_confidence);
    setConfirmationSummary(result.confirmation_summary);
    setLoading(false);
    showToast("Photo analyzed successfully! Review the details below.", "success");
  }

  function handleGalleryChange(e) { processFile(e.target.files[0]); }
  function handleCameraChange(e) { processFile(e.target.files[0]); }

  function handleDragOver(e) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) processFile(file);
  }

  function resetForm() {
    setPhoto(null);
    setPhotoPreview(null);
    setCategory("");
    setDescription("");
    setSeverity(3);
    setAiConfidence(null);
    setConfirmationSummary("");
    setWasEdited(false);
    setLoading(false);
    setLoadingStep(0);
    // Location bhi reset karo — warna purani photo ki location naye upload pe chipak jaati hai
    setLocation(null);
    setExifLocation(null);
    setManualLocation(null);
    setLocationLabel("");
    setLocationArea("");
    setShowLocationPicker(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!location) {
      showToast("Location is required. Please enable location access.", "Error");
      return;
    }
    const formData = new FormData();
    formData.append("file", photo);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("description_original", description);
    formData.append("language_code", i18n.language);
    formData.append("severity", severity);
    formData.append("is_likely_genuine", isLikelyGenuine);
    formData.append("ai_confidence", aiConfidence == null ? "" : aiConfidence);
    const finalLat = manualLocation ? manualLocation.lat
      : exifLocation ? exifLocation.lat
        : location?.latitude;
    const finalLng = manualLocation ? manualLocation.lng
      : exifLocation ? exifLocation.lng
        : location?.longitude;
    formData.append("latitude", finalLat);
    formData.append("longitude", finalLng);
    formData.append("area_name", locationArea || "");
    formData.append("was_edited", wasEdited);
    formData.append("confirmation_summary", confirmationSummary);

    const result = await submitReport(formData);
    setConfirmationSummary(result.confirmation_summary);
    setSubmittedId(result.id);
    setSubmitted(true);
  }

  // ── CONFIRMATION ──
  if (submitted) {
    return (
      <div style={{
        padding: "40px 28px",
        borderRadius: "20px",
        background: "var(--success-bg)",
        border: "1px solid var(--success)",
        textAlign: "center",
      }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%",
          background: "var(--success)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px",
        }}>
          <IconCheck width="26" height="26" />
        </div>
        <h2 style={{
          fontFamily: "var(--heading)",
          color: "var(--text-h)",
          margin: "0 0 12px",
          fontSize: "22px",
          fontWeight: "800",
        }}>
          {t("submitted_heading")}
        </h2>
        {submittedId && (
          <p style={{ fontSize: "13px", color: "var(--text)", marginBottom: "8px", opacity: 0.7 }}>
            Issue #{submittedId}
          </p>
        )}
        <p style={{
          color: "var(--text)",
          margin: "0 0 28px",
          lineHeight: "1.7",
          fontSize: "15px",
        }}>
          {confirmationSummary}
        </p>
        <button
          onClick={function () { setSubmitted(false); resetForm(); }}
          style={{
            padding: "11px 24px",
            background: "linear-gradient(135deg, var(--indigo-2), var(--teal))",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
            fontFamily: "var(--heading)",
          }}
        >
          + Report Another Issue
        </button>
      </div>
    );
  }

  // ── MAIN FORM ──
  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 20px",
          borderRadius: "10px",
          background: toast.type === "success" ? "var(--success)"
            : toast.type === "error" ? "var(--danger)"
              : "var(--marigold)",
          color: "white",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: "0 8px 24px rgba(29,27,58,0.25)",
          zIndex: 999,
          maxWidth: "320px",
          animation: "slideUp 0.3s ease",
        }}>
          {toast.type === "success" ? <IconCheck /> : toast.type === "error" ? <IconX /> : <IconWarning />}
          {toast.message}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* ── UPLOAD ZONE ── */}
        {!photo && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: dragOver
                ? "1.5px solid var(--indigo-2)"
                : "1.5px dashed var(--border)",
              borderRadius: "16px",
              padding: "40px 24px",
              textAlign: "center",
              background: dragOver ? "var(--accent-bg)" : "var(--bg-subtle)",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ color: "var(--indigo-2)", marginBottom: "12px", display: "flex", justifyContent: "center" }}>
              <IconUpload width="34" height="34" />
            </div>
            <p style={{
              fontFamily: "var(--heading)",
              fontSize: "16px",
              fontWeight: "700",
              color: "var(--text-h)",
              margin: "0 0 6px",
            }}>
              {dragOver ? "Release to upload" : "Drop your photo here"}
            </p>
            <p style={{
              fontSize: "13px",
              color: "var(--text)",
              margin: "0 0 20px",
            }}>
              or choose from below
            </p>

            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}>
              <input
                id="gallery-input"
                type="file"
                accept="image/*"
                onChange={handleGalleryChange}
                style={{ display: "none" }}
              />
              <label
                htmlFor="gallery-input"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 22px",
                  background: "linear-gradient(135deg, var(--indigo-2), var(--coral))",
                  color: "white",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "700",
                  fontFamily: "var(--heading)",
                  boxShadow: "0 8px 18px rgba(69,60,158,0.3)",
                  transition: "transform 0.15s ease",
                }}
              >
                <IconUpload />
                <span>{t("upload_photo")}</span>
              </label>

              <input
                id="camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraChange}
                style={{ display: "none" }}
              />
              <label
                htmlFor="camera-input"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 22px",
                  background: "var(--bg)",
                  color: "var(--indigo-2)",
                  border: "1.5px solid var(--indigo-2)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "700",
                  fontFamily: "var(--heading)",
                  transition: "all 0.2s",
                }}
              >
                <IconCamera />
                <span>{t("take_photo")}</span>
              </label>
            </div>
          </div>
        )}

        {/* ── PHOTO PREVIEW ── */}
        {photo && (
          <div style={{
            borderRadius: "16px",
            border: "1px solid var(--border)",
            overflow: "hidden",
            background: "var(--bg)",
            boxShadow: "var(--shadow)",
          }}>
            <div style={{ position: "relative" }}>
              <img
                src={photoPreview}
                alt="Selected issue"
                style={{
                  width: "100%",
                  maxHeight: "220px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {!loading && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    position: "absolute",
                    top: "10px", right: "10px",
                    background: "rgba(29,27,58,0.65)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "28px", height: "28px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconX />
                </button>
              )}
              {loading && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(29,27,58,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <div style={{
                    width: "40px", height: "40px",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTop: "3px solid white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                </div>
              )}
            </div>

            {/* Loading steps */}
            {loading && (
              <div style={{
                padding: "16px 20px",
                background: "var(--accent-bg)",
                borderTop: "1px solid var(--accent-border)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--indigo-2)",
                  fontFamily: "var(--heading)",
                  marginBottom: "10px",
                }}>
                  <IconSparkle /> AI analysis in progress
                </div>
                {LOADING_STEPS.map(function (step, i) {
                  return (
                    <div key={step} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      opacity: i <= loadingStep ? 1 : 0.35,
                      transition: "opacity 0.4s ease",
                    }}>
                      <span style={{
                        width: "14px", height: "14px", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: i < loadingStep ? "var(--success)" : i === loadingStep ? "var(--indigo-2)" : "transparent",
                        border: i <= loadingStep ? "none" : "1.5px solid var(--border)",
                        color: "#fff", flexShrink: 0,
                      }}>
                        {i < loadingStep && <IconCheck width="9" height="9" />}
                      </span>
                      <span style={{
                        fontSize: "12px",
                        color: i <= loadingStep ? "var(--text-h)" : "var(--text)",
                        fontWeight: i === loadingStep ? "600" : "400",
                      }}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* //Location preview and edit button */}
        {locationLabel && (
          <p style={{
            fontSize: "12.5px",
            color: "var(--text)",
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            opacity: 0.8,
          }}>
            {locationLabel}
            {exifLocation && (
              <span style={{ opacity: 0.6 }}>
                ({exifLocation.lat.toFixed(4)}, {exifLocation.lng.toFixed(4)})
              </span>
            )}
          </p>
        )}
        {photo && locationLabel && (
          <button
            type="button"
            onClick={function () { setShowLocationPicker(true); }}
            style={{
              fontSize: "12px",
              color: "var(--accent)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              fontFamily: "var(--sans)",
              textDecoration: "underline",
            }}
          >
            Wrong location? Fix it
          </button>
        )}

        {/* Location Picker on map */}
        {showLocationPicker && (
          <div style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}>
            <div style={{
              background: "var(--surface)",
              borderRadius: "14px",
              overflow: "hidden",
              width: "100%",
              maxWidth: "520px",
            }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "var(--text-h)" }}>Pin your location</strong>
                <button onClick={function () { setShowLocationPicker(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}>✕</button>
              </div>
              <form
                onSubmit={handleLocationSearch}
                style={{ display: "flex", gap: "8px", padding: "10px 18px", borderBottom: "1px solid var(--border)" }}
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={function (e) { setSearchQuery(e.target.value); }}
                  placeholder="Search area, e.g. Koramangala"
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: "8px",
                    border: "1px solid var(--border)", background: "var(--bg)",
                    color: "var(--text-h)", fontSize: "13px",
                  }}
                />
                <button type="submit" style={{
                  padding: "8px 14px", borderRadius: "8px", border: "none",
                  background: "var(--accent)", color: "#fff", fontSize: "13px", cursor: "pointer",
                }}>
                  Go
                </button>
              </form>
              <MapContainer
                center={[
                  exifLocation?.lat ?? 12.9716,
                  exifLocation?.lng ?? 77.5946,
                ]}
                zoom={14}
                style={{ height: "340px", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapFlyTo target={searchFlyTo} />
                <LocationClickCatcher
                  onPick={async function (lat, lng) {
                    setManualLocation({ lat, lng });
                    setShowLocationPicker(false);
                    setLocationLabel("📍 Locating...");
                    const area = await getAreaName(lat, lng);
                    setLocationLabel(`📍 ${area} (manually set)`);
                    setLocationArea(area);
                  }}
                />
              </MapContainer>
              <p style={{ padding: "12px 18px", fontSize: "12.5px", color: "var(--text)", margin: 0 }}>
                Tap on the map to set your exact location.
              </p>
            </div>
          </div>
        )}
        {/* ── FORM FIELDS ── */}
        {photo && !loading && (
          <div style={{
            background: "var(--bg)",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxShadow: "var(--shadow)",
          }}>

            {!isLikelyGenuine && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "12px 20px",
                background: "var(--danger-bg)",
                borderBottom: "1px solid var(--danger)",
                color: "var(--danger)",
                fontSize: "13px",
                fontWeight: "600",
              }}>
                <IconWarning /> {t("fake_warning")}
              </div>
            )}

            {/* Category chips */}
            <div style={{ padding: "20px 20px 0" }}>
              <label style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text)",
                display: "block",
                marginBottom: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                fontFamily: "var(--heading)",
              }}>
                {t("category")}
              </label>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "20px",
              }}>
                {CATEGORIES.map(function (cat) {
                  const color = CATEGORY_COLORS[cat];
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={function () { setCategory(cat); setWasEdited(true); }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        borderRadius: "20px",
                        border: isSelected
                          ? `2px solid ${color}`
                          : "1.5px solid var(--border)",
                        background: isSelected
                          ? color + "18"
                          : "var(--bg-subtle)",
                        color: isSelected ? color : "var(--text)",
                        fontSize: "13px",
                        fontWeight: isSelected ? "700" : "500",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        fontFamily: "var(--sans)",
                      }}
                    >
                      <CategoryIcon category={cat} size={14} color={isSelected ? color : "var(--text)"} />
                      <span>{t("category_" + cat)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ height: "1px", background: "var(--border)", margin: "0 20px" }} />

            {/* Description */}
            <div style={{ padding: "20px" }}>
              <label style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text)",
                display: "block",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                fontFamily: "var(--heading)",
              }}>
                {t("description")}
              </label>
              <textarea
                value={description}
                onChange={function (e) { setDescription(e.target.value); setWasEdited(true); }}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  fontSize: "14px",
                  resize: "vertical",
                  boxSizing: "border-box",
                  background: "var(--bg-subtle)",
                  color: "var(--text-h)",
                  fontFamily: "var(--sans)",
                  lineHeight: "1.5",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ height: "1px", background: "var(--border)", margin: "0 20px" }} />

            {/* Severity */}
            <div style={{ padding: "20px" }}>
              <label style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--text)",
                display: "block",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                fontFamily: "var(--heading)",
              }}>
                {t("severity")}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {SEVERITY_META.map(function (s, idx) {
                  const val = idx + 1;
                  const isActive = severity === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={function () { setSeverity(val); setWasEdited(true); }}
                      style={{
                        flex: 1,
                        padding: "10px 4px",
                        borderRadius: "8px",
                        border: isActive
                          ? `2px solid ${s.color}`
                          : "1.5px solid var(--border)",
                        background: isActive ? s.color + "18" : "var(--bg-subtle)",
                        color: isActive ? s.color : "var(--text)",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        textAlign: "center",
                        fontFamily: "var(--sans)",
                      }}
                    >
                      <div style={{ fontSize: "16px", marginBottom: "2px" }}>{val}</div>
                      <div style={{
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}>
                        {s.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer row — confidence + submit */}
            <div style={{
              padding: "16px 20px",
              background: "var(--bg-subtle)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}>
              {aiConfidence ? (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "var(--indigo-2)",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  padding: "5px 12px",
                  borderRadius: "20px",
                }}>
                  <IconSparkle /> {t("confidence", { percent: Math.round(aiConfidence * 100) })}
                </div>
              ) : <div />}

              <button
                type="button"
                onClick={handleSubmit}
                style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, var(--indigo-2), var(--coral))",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "800",
                  cursor: "pointer",
                  fontFamily: "var(--heading)",
                  letterSpacing: "-0.2px",
                  boxShadow: "0 8px 18px rgba(69,60,158,0.3)",
                  transition: "transform 0.15s ease",
                }}
              >
                {t("submit")}
              </button>
            </div>

          </div>
        )}

      </div>
    </>
  );
}
