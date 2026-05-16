import OpenAI from "openai";

const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];

export const openaiAvailable = Boolean(baseURL && apiKey);

export const openai = openaiAvailable
  ? new OpenAI({ baseURL, apiKey })
  : null;
