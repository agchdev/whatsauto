export const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "--";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `${value} EUR`;
  return `${numeric.toFixed(2)} EUR`;
};

export const formatDuration = (value) => {
  if (value === null || value === undefined || value === "") return "--";
  return `${value} min`;
};

export const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};
