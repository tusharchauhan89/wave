import api from "../api/axios";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatActionData {
  reply: string;
  action?: string | null;
  query?: string | null;
  provider?: string;
}

export interface ChatStatus {
  success: boolean;
  provider: string;
  smart: boolean;
  keys: {
    gemini?: boolean;
    groq?: boolean;
    openai?: boolean;
  };
}

export const getChatStatus = async (): Promise<ChatStatus> => {
  const res = await api.get("/api/chat/status");
  return res.data;
};

export const sendChatMessage = async (
  message: string,
  history: ChatMessage[] = []
): Promise<ChatActionData> => {
  const res = await api.post("/api/chat/", {
    message,
    history: history.slice(-10),
  });
  return res.data.data || res.data;
};