export const fetchDashboardData = async ({ supabase, userId }) => {
  const errors = [];

  const { data: employeeData, error: employeeError } = await supabase
    .from("empleados")
    .select("uuid,id_empresa,nombre,correo,telefono,role")
    .eq("user_id", userId)
    .single();

  if (employeeError || !employeeData) {
    return {
      companyName: "",
      employee: null,
      services: [],
      clients: [],
      error: "No pudimos cargar los datos del empleado.",
    };
  }

  const companyPromise = employeeData?.id_empresa
    ? supabase
        .from("empresas")
        .select("nombre")
        .eq("uuid", employeeData.id_empresa)
        .single()
    : Promise.resolve({ data: null, error: null });

  const [companyResponse, servicesResponse, clientsResponse] =
    await Promise.all([
      companyPromise,
      supabase
        .from("servicios")
        .select("uuid,nombre,duracion,precio")
        .order("nombre", { ascending: true }),
      supabase
        .from("clientes")
        .select("uuid,nombre,telefono")
        .order("nombre", { ascending: true })
        .limit(6),
    ]);

  if (companyResponse?.error) {
    errors.push("No pudimos cargar la empresa.");
  }
  if (servicesResponse?.error) {
    errors.push("No pudimos cargar los servicios.");
  }
  if (clientsResponse?.error) {
    errors.push("No pudimos cargar los clientes.");
  }

  return {
    companyName: companyResponse?.data?.nombre ?? "",
    employee: employeeData,
    services: servicesResponse?.data ?? [],
    clients: clientsResponse?.data ?? [],
    error: errors.join(" "),
  };
};
