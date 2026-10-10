/** Small stroke icons in the spirit of SF Symbols. Decorative: always aria-hidden. */
type P = { className?: string };
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const HomeIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 11.2 12 4l8 7.2V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>
);
export const PhoneIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
);
export const SimIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M8 3h6.5L19 7.5V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><rect x="9.5" y="11" width="6" height="6" rx="1" /></svg>
);
export const WifiIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M2.5 9a14 14 0 0 1 19 0" /><path d="M5.8 12.4a9.2 9.2 0 0 1 12.4 0" /><path d="M9 15.7a4.6 4.6 0 0 1 6 0" /><circle cx="12" cy="19" r="1" fill="currentColor" /></svg>
);
export const PlaneIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="m21 3-9.5 9.5" /><path d="m21 3-6.5 18-3-8.5L3 9.5z" /></svg>
);
export const SearchIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...base} strokeWidth={3} className={className}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const ChevronIcon = ({ className }: P) => (
  <svg {...base} strokeWidth={2.4} className={className}><path d="m9 5 7 7-7 7" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base} strokeWidth={2.4} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const SunIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></svg>
);
export const MoonIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>
);
