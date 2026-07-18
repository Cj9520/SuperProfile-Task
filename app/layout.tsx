import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | SuperProfile",
    default: "SuperProfile — Customer Communication Platform",
  },
  description:
    "SuperProfile is a multi-tenant customer support platform with live chat, email support, knowledge base, and AI-powered summaries.",
  keywords: ["customer support", "live chat", "helpdesk", "knowledge base"],
  authors: [{ name: "SuperProfile" }],
  openGraph: {
    title: "SuperProfile — Customer Communication Platform",
    description: "Modern customer support with live chat, email, and AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "hsl(var(--card))",
              color: "hsl(var(--card-foreground))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "var(--font-sans), sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
