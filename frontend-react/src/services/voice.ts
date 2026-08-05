import api from "../api/axios";

export interface VoiceParseResult {
  action?: string;
  query?: string;
  message?: string;
  original?: string;
}

export const parseVoiceCommand = async (
  text: string
): Promise<VoiceParseResult> => {
  const res = await api.post("/api/voice/parse", { text });
  return res.data;
};