import { getSupabaseClient } from "./supabaseClient";

export const createEmployeeProfile = async ({
  companyId,
  name,
  email,
  phone,
  dni,
  role,
  active,
}) => {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    return { data: null, error };
  }

  // Inserta un empleado nuevo en la tabla "empleados".
  // Ajusta los campos si agregas columnas o cambias el esquema.
  const { data, error } = await supabase
    .from("empleados")
    .insert({
      id_empresa: companyId,
      nombre: name,
      correo: email || null,
      telefono: phone || null,
      dni: dni || null,
      role,
      activo: active,
    })
    .select("uuid,nombre,correo,telefono,dni,role,activo")
    .single();

  return { data: data || null, error: error || null };
};

export const updateEmployeeProfile = async ({
  employeeId,
  name,
  email,
  phone,
  dni,
  role,
  active,
}) => {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    return { error };
  }

  // Actualiza datos del empleado en la tabla "empleados".
  // Agrega o quita campos segun necesites (por ejemplo, role o activo).
  const { error } = await supabase
    .from("empleados")
    .update({
      nombre: name,
      correo: email || null,
      telefono: phone || null,
      dni: dni || null,
      role,
      activo: active,
    })
    .eq("uuid", employeeId);

  return { error: error || null };
};
