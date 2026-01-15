import ConfirmationPage from "../../../../components/confirmations/ConfirmationPage";

const normalizeSegment = (value) =>
  typeof value === "string" ? value.trim() : "";

export default function ConfirmationByTypePage({ params }) {
  const tipo = normalizeSegment(params?.tipo);
  const token = normalizeSegment(params?.token);

  return <ConfirmationPage token={token} tipo={tipo} />;
}
