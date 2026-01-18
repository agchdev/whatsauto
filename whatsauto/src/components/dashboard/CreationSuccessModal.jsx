"use client";

const BUTTON_CLASSES =
  "mt-5 inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--supabase-green)] hover:text-[color:var(--supabase-green)]";

export default function CreationSuccessModal({
  isOpen,
  title,
  message,
  onClose,
}) {
  if (!isOpen) return null;

  const resolvedTitle = title?.trim() || "Listo";
  const resolvedMessage = message?.trim() || "";

  const handleClose = () => {
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-6 py-10 motion-safe:animate-[confirm-backdrop_0.25s_ease-out_both]"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-center shadow-[0_40px_120px_-70px_rgba(0,0,0,0.9)] motion-safe:animate-[reveal_0.4s_ease-out_both]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center gap-3">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.45)] bg-[color:rgb(var(--supabase-green-rgb)/0.12)] motion-safe:animate-[confirm-pop_0.5s_ease-out_both]">
            <span className="absolute inset-0 rounded-full border border-[color:rgb(var(--supabase-green-rgb)/0.6)] motion-safe:animate-[confirm-ring_0.9s_ease-out_both]" />
            <svg
              className="h-7 w-7 text-[color:var(--supabase-green-bright)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path
                className="motion-safe:animate-[confirm-draw_0.6s_ease-out_both]"
                d="M5 13l4 4L19 7"
                strokeDasharray="24"
                strokeDashoffset="24"
              />
            </svg>
          </span>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Creado
          </p>
          <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
            {resolvedTitle}
          </h3>
          {resolvedMessage && (
            <p className="text-sm text-[color:var(--muted)]">
              {resolvedMessage}
            </p>
          )}
          <button className={BUTTON_CLASSES} onClick={handleClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
