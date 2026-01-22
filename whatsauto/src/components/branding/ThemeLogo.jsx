export default function ThemeLogo({ className = "", label = "WeLyd logo" }) {
  return (
    <div
      aria-label={label}
      role="img"
      className={`bg-center bg-no-repeat bg-contain ${className}`}
      style={{ backgroundImage: "var(--welyd-logo-url)" }}
    />
  );
}
