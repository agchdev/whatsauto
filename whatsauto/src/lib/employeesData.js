export const createEmployeeProfile = async ({
  accessToken,
  name,
  email,
  phone,
  dni,
  role,
  active,
}) => {
  if (!accessToken) {
    return { data: null, error: new Error("Sesion invalida.") };
  }

  const response = await fetch("/api/employees", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      phone,
      dni,
      role,
      active,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.status !== "ok") {
    return {
      data: null,
      error: new Error(payload.message || "No pudimos crear el empleado."),
    };
  }

  return { data: payload.employee || null, error: null };
};

export const updateEmployeeProfile = async ({
  accessToken,
  employeeId,
  name,
  email,
  phone,
  dni,
  role,
  active,
}) => {
  if (!accessToken) {
    return { error: new Error("Sesion invalida.") };
  }

  const response = await fetch("/api/employees", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      employeeId,
      name,
      email,
      phone,
      dni,
      role,
      active,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.status !== "ok") {
    return {
      error: new Error(payload.message || "No pudimos actualizar el empleado."),
    };
  }

  return { error: null };
};
