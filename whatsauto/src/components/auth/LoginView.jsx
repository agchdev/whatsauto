import LoginHero from "./LoginHero";
import LoginPanel from "./LoginPanel";

export default function LoginView({ email, status, isLoading, onEmailChange, onSubmit }) {
  return (
    <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <LoginHero />
      <LoginPanel
        email={email}
        isLoading={isLoading}
        onEmailChange={onEmailChange}
        onSubmit={onSubmit}
        status={status}
      />
    </div>
  );
}
