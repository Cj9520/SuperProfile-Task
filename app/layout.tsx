import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

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
    <html lang="en" suppressHydrationWarning>
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
              borderRadius: "10px",
              fontSize: "14px",
              fontFamily: "Inter, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
