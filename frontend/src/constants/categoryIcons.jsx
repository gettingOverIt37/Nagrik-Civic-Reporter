// Shared line-icon set for civic categories.
// Used in App.jsx (hero badges) and ReportForm.jsx (category chips)
// so both places always stay visually in sync.

const PATHS = {
  pothole: (
    <>
      <ellipse cx="12" cy="12" rx="8" ry="5" />
      <path d="M8 11l2 1.5-1 2M13 10l2 2-1.5 1.8" />
    </>
  ),
  garbage: (
    <>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M4 8h16M9 8V5h6v3" />
    </>
  ),
  streetlight: (
    <>
      <path d="M12 3v9" />
      <path d="M8 6a4 4 0 018 0" />
      <path d="M12 21v-3M9 21h6" />
      <path d="M6 12h2M16 12h2M7.5 9.5l1.4 1.4M15.1 9.5l-1.4 1.4" />
    </>
  ),
  drainage: <path d="M4 9h16M4 13h16M4 17h16" />,
  water_leakage: <path d="M12 3s6 7 6 11.5a6 6 0 01-12 0C6 10 12 3 12 3z" />,
  stray_animals: (
    <>
      <ellipse cx="12" cy="16" rx="5" ry="4" />
      <ellipse cx="7" cy="8" rx="1.6" ry="2" />
      <ellipse cx="12" cy="6" rx="1.6" ry="2.2" />
      <ellipse cx="17" cy="8" rx="1.6" ry="2" />
    </>
  ),
  other: (
    <>
      <circle cx="12" cy="10" r="2.4" />
      <path d="M12 21c-4-4.3-6-7.8-6-10.5A6 6 0 0118 10.5c0 2.7-2 6.2-6 10.5z" />
    </>
  ),
};

export default function CategoryIcon({ category, size = 18, color = "currentColor", strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[category] || PATHS.other}
    </svg>
  );
}
