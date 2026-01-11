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
