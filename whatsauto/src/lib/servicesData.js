import { getSupabaseClient } from "./supabaseClient";

export const createServiceWithAssignment = async ({
  companyId,
  name,
  duration,
  price,
  employeeId,
}) => {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    return { data: null, error };
  }

  // 1) Crear el servicio base. Agrega o elimina campos segun tu esquema.
  const { data: createdService, error: serviceError } = await supabase
    .from("servicios")
    .insert({
      id_empresa: companyId,
      nombre: name,
      duracion: duration,
      precio: price,
    })
    .select("uuid,nombre,duracion,precio")
    .single();

  if (serviceError) {
    return { data: null, error: serviceError };
  }

  // 2) Asignar el servicio al empleado en la tabla puente.
  // Si en el futuro permites multiples empleados, cambia esto por un insert en lote.
  const { error: linkError } = await supabase.from("servicios_empleados").insert({
    id_servicio: createdService.uuid,
    id_empleado: employeeId,
  });

  if (linkError) {
    return { data: createdService, error: linkError };
  }

  return { data: createdService, error: null };
};

export const updateServiceWithAssignment = async ({
  serviceId,
  name,
  duration,
  price,
  employeeId,
}) => {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    return { error };
  }

  // 1) Actualizar los datos del servicio.
  const { error: updateError } = await supabase
    .from("servicios")
    .update({
      nombre: name,
      duracion: duration,
      precio: price,
    })
    .eq("uuid", serviceId);

  if (updateError) {
    return { error: updateError };
  }

  // 2) Limpiar asignaciones previas. Si prefieres multiples empleados, elimina este paso.
  const { error: deleteError } = await supabase
    .from("servicios_empleados")
    .delete()
    .eq("id_servicio", serviceId);

  if (deleteError) {
    return { error: deleteError };
  }

  // 3) Crear la nueva asignacion.
  const { error: assignError } = await supabase.from("servicios_empleados").insert({
    id_servicio: serviceId,
    id_empleado: employeeId,
  });

  if (assignError) {
    return { error: assignError };
  }

  return { error: null };
};
