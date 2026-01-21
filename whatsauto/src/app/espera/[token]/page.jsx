import ConfirmationPage from "../../../components/confirmations/ConfirmationPage";

const normalizeSegment = (value) =>
  typeof value === "string" ? value.trim() : "";

export default async function WaitlistConfirmationPage({ params }) {
  const resolvedParams = await params;
  const token = normalizeSegment(resolvedParams?.token);

  return <ConfirmationPage token={token} tipo="espera" defaultTipo="espera" />;
}
