import { AnalysisResult, SearchParams } from "../types";

// In production (Vercel), we will set REACT_APP_API_URL to the Render Backend URL.
// If not set, it defaults to localhost for testing.
const BACKEND_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/analyze";

export const fetchProductAnalysis = async (params: SearchParams): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set your Gemini API Key.");
  }

  console.log("Connecting to backend at:", BACKEND_URL);

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data as AnalysisResult;
  } catch (error) {
    console.error("Analysis Service Error:", error);
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        `Could not connect to the Backend at ${BACKEND_URL}. If you just deployed, the server might be waking up (wait 1 min).`
      );
    }
    throw error;
  }
};