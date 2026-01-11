export default function ClientsCard({ clients }) {
  return (
    <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_70px_-60px_rgba(0,0,0,0.9)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Clientes
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
            Clientes recientes
          </h2>
        </div>
        <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted-strong)]">
          {clients.length}
        </span>
      </div>
      <div className="mt-6 space-y-3">
        {clients.length ? (
          clients.map((client) => (
            <div
              key={client.uuid}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">
                  {client.nombre}
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  {client.telefono || "Sin telefono"}
                </p>
              </div>
              <span className="text-xs text-[color:var(--muted-strong)]">
                Ver ficha
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[color:var(--muted)]">
            Sin clientes registrados por ahora.
          </p>
        )}
      </div>
    </article>
  );
}
