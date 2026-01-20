export const createServiceWithAssignment = async ({
  accessToken,
  name,
  duration,
  price,
  employeeId,
}) => {
  if (!accessToken) {
    return { data: null, error: new Error("Sesion invalida.") };
  }

  const response = await fetch("/api/services", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      duration,
      price,
      employeeId,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.status !== "ok") {
    return {
      data: null,
      error: new Error(payload.message || "No pudimos guardar el servicio."),
    };
  }

  return { data: payload.service || null, error: null };
};

export const updateServiceWithAssignment = async ({
  accessToken,
  serviceId,
  name,
  duration,
  price,
  employeeId,
}) => {
  if (!accessToken) {
    return { error: new Error("Sesion invalida.") };
  }

  const response = await fetch("/api/services", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      serviceId,
      name,
      duration,
      price,
      employeeId,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.status !== "ok") {
    return {
      error: new Error(payload.message || "No pudimos guardar el servicio."),
    };
  }

  return { error: null };
};
