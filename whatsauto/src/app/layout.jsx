import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import ThemeSync from "../components/theme/ThemeSync";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "WhatsAuto | Acceso",
  description: "Accede a WhatsAuto con autenticacion de Supabase.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
