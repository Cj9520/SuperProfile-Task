import Pusher from "pusher";
import PusherClient from "pusher-js";

// ─── Server-side Pusher ───────────────────────────────────────────────────────

let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID || "demo",
      key: process.env.PUSHER_APP_KEY || "demo",
      secret: process.env.PUSHER_APP_SECRET || "demo",
      cluster: process.env.PUSHER_CLUSTER || "ap2",
      useTLS: true,
    });
  }
  return pusherServer;
}

// ─── Channel name helpers ─────────────────────────────────────────────────────

export function workspaceChannel(workspaceId: string) {
  return `workspace-${workspaceId}`;
}

export function conversationChannel(conversationId: string) {
  return `conversation-${conversationId}`;
}

export function widgetChannel(visitorToken: string) {
  return `widget-${visitorToken}`;
}

// ─── Event names ──────────────────────────────────────────────────────────────

export const PUSHER_EVENTS = {
  NEW_MESSAGE: "new-message",
  TYPING_START: "typing-start",
  TYPING_STOP: "typing-stop",
  CONVERSATION_UPDATED: "conversation-updated",
  PRESENCE_ONLINE: "presence-online",
  PRESENCE_OFFLINE: "presence-offline",
  NOTIFICATION: "notification",
} as const;

// ─── Broadcast helpers ────────────────────────────────────────────────────────

export async function broadcastToWorkspace(
  workspaceId: string,
  event: string,
  data: unknown
) {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(workspaceChannel(workspaceId), event, data);
  } catch (err) {
    console.error("[Pusher] broadcast error:", err);
  }
}

export async function broadcastToConversation(
  conversationId: string,
  event: string,
  data: unknown
) {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(conversationChannel(conversationId), event, data);
  } catch (err) {
    console.error("[Pusher] conversation broadcast error:", err);
  }
}

export async function broadcastToWidget(
  visitorToken: string,
  event: string,
  data: unknown
) {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(widgetChannel(visitorToken), event, data);
  } catch (err) {
    console.error("[Pusher] widget broadcast error:", err);
  }
}

// ─── Client-side Pusher singleton ─────────────────────────────────────────────

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (typeof window === "undefined") throw new Error("getPusherClient called on server");
  const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
  if (!key || key === "your-pusher-key" || key === "demo") {
    throw new Error("Pusher not configured — set NEXT_PUBLIC_PUSHER_APP_KEY");
  }
  if (!pusherClient) {
    pusherClient = new PusherClient(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
    });
  }
  return pusherClient;
}
