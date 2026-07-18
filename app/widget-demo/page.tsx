import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Widget Demo — SuperProfile",
  description: "Test the SuperProfile live chat widget",
};

export default async function WidgetDemoPage() {
  // Get first workspace widget token for demo
  const { prisma } = await import("@/lib/db");
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const token = workspace?.widgetToken || "demo";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3001";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#0b0b0d",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "20px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            backdropFilter: "blur(12px)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#141416",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ⚡
          </div>
          <div>
            <p style={{ color: "white", fontWeight: 700, fontSize: 18, margin: 0 }}>
              SuperProfile
            </p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0 }}>
              Widget Demo Page
            </p>
          </div>
        </header>

        {/* Hero */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 32px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              color: "white",
              fontSize: 48,
              fontWeight: 800,
              margin: "0 0 16px",
              lineHeight: 1.2,
            }}
          >
            Live Chat Widget
            <br />
            <span
              style={{
                background: "#26262b",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Demo
            </span>
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 18,
              maxWidth: 560,
              lineHeight: 1.6,
              margin: "0 0 40px",
            }}
          >
            The chat bubble in the bottom right is powered by SuperProfile. Click
            it to start a conversation and see it appear live in the dashboard.
          </p>

          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: "24px 32px",
              maxWidth: 540,
              width: "100%",
              backdropFilter: "blur(12px)",
            }}
          >
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                margin: "0 0 12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Embed code — copy to any website
            </p>
            <code
              style={{
                display: "block",
                background: "rgba(0,0,0,0.4)",
                padding: "14px 18px",
                borderRadius: 10,
                color: "#a78bfa",
                fontSize: 13,
                textAlign: "left",
                wordBreak: "break-all",
                lineHeight: 1.6,
              }}
            >
              {`<script src="${appUrl}/widget-loader.js" data-widget-token="${token}"></script>`}
            </code>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 32,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              "✅ Real-time messaging",
              "✅ Persistent history",
              "✅ Article suggestions",
              "✅ Typing indicators",
            ].map((f) => (
              <div
                key={f}
                style={{
                  background: "rgba(99,102,241,0.2)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 100,
                  padding: "8px 18px",
                  color: "#a1a1aa",
                  fontSize: 13,
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </main>

        {/* The actual widget embed */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          src={`${appUrl}/widget-loader.js`}
          data-widget-token={token}
          async
        />
      </body>
    </html>
  );
}
