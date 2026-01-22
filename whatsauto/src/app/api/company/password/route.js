import { createHash, timingSafeEqual } from "crypto";
import { buildResponse, requireAuth, requireEmployee } from "../../_helpers";

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const normalizeHash = (value) => (typeof value === "string" ? value.trim() : "");
const isBcryptHash = (hash = "") =>
  hash.startsWith("$2a$") ||
  hash.startsWith("$2b$") ||
  hash.startsWith("$2y$") ||
  hash.startsWith("$2$");
const isHex = (value, length) =>
  value.length === length && /^[0-9a-f]+$/i.test(value);
const hashWith = (algo, value) => createHash(algo).update(value).digest("hex");

const verifyPassword = (password, hash) => {
  if (!hash) return false;
  const normalized = normalizeHash(hash);
  const lower = normalized.toLowerCase();

  if (lower.startsWith("sha256:")) {
    const digest = hashWith("sha256", password);
    return safeEqual(digest, lower.slice("sha256:".length));
  }
  if (lower.startsWith("sha512:")) {
    const digest = hashWith("sha512", password);
    return safeEqual(digest, lower.slice("sha512:".length));
  }
  if (isHex(lower, 64)) {
    const digest = hashWith("sha256", password);
    return safeEqual(digest, lower);
  }
  if (isHex(lower, 128)) {
    const digest = hashWith("sha512", password);
    return safeEqual(digest, lower);
  }

  return safeEqual(password, normalized);
};

const verifyPasswordWithRpc = async (client, companyId, password) => {
  const { data, error } = await client.rpc("verify_company_password", {
    company_id: companyId,
    plain_password: password,
  });

  if (error) {
    return { ok: false, error };
  }

  return { ok: true, data: Boolean(data) };
};

export async function POST(request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { client, user } = auth;
  const body = await request.json().catch(() => ({}));
  const password = normalizeText(body.password);

  if (!password) {
    return buildResponse(
      "invalid",
      { message: "Escribe la contrasena de la empresa." },
      400
    );
  }

  const employeeResult = await requireEmployee(client, user.id);
  if (employeeResult.response) return employeeResult.response;

  const { data: company, error: companyError } = await client
    .from("empresas")
    .select("uuid,password_hash")
    .eq("uuid", employeeResult.employee.id_empresa)
    .single();

  if (companyError || !company) {
    return buildResponse(
      "not_found",
      {
        message: "Empresa no encontrada.",
        details: companyError?.message,
      },
      404
    );
  }

  if (!company.password_hash) {
    return buildResponse(
      "invalid",
      { message: "La empresa no tiene contrasena configurada." },
      400
    );
  }

  let isValid = false;
  const rpcResult = await verifyPasswordWithRpc(client, company.uuid, password);

  if (!rpcResult.ok) {
    const errorCode = rpcResult.error?.code || "";
    const errorMessage = rpcResult.error?.message || "";
    const shouldFallback =
      errorCode === "PGRST202" ||
      errorMessage.includes("verify_company_password");

    if (shouldFallback) {
      if (isBcryptHash(company.password_hash)) {
        return buildResponse(
          "error",
          {
            message:
              "La contrasena usa bcrypt pero falta la funcion verify_company_password.",
          },
          500
        );
      }
      isValid = verifyPassword(password, company.password_hash);
    } else {
      return buildResponse(
        "error",
        {
          message: "No pudimos validar la contrasena.",
          details: errorMessage,
        },
        500
      );
    }
  } else {
    isValid = rpcResult.data;
  }
  if (!isValid) {
    return buildResponse(
      "unauthorized",
      { message: "Contrasena incorrecta." },
      401
    );
  }

  return buildResponse("ok", { company_id: company.uuid });
}
