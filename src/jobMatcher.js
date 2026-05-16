import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import "./loadEnv.js";

const matchScoreSchema = z.object({
  score: z.number().describe("Matching score between 0 and 100 as a float"),
});

function normalizeScore(rawScore) {
  if (typeof rawScore !== "number" || Number.isNaN(rawScore)) return 0;

  // Some models/tools may return 0..1; treat that as a fraction.
  const score = rawScore >= 0 && rawScore <= 1 ? rawScore * 100 : rawScore;
  return Math.max(0, Math.min(100, score));
}

function createStructuredLlm() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const modelName = process.env.OPENAI_MODEL || "gpt-4";
  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
    openAIApiKey: apiKey,
  });

  return model.withStructuredOutput(matchScoreSchema);
}

let structuredLlm = null;

/**
 * Calculate the match score between the resume and job details.
 *
 * @param {string} resumeText - The text of the resume.
 * @param {string} jobDetails - The job description and details.
 * @returns {Promise<number>} - Matching score as a float.
 */
export async function calculateMatchScore(resumeText, jobDetails) {
  try {
    if (process.env.DISABLE_LLM_MATCHING === "true") {
      return 0;
    }

    if (!structuredLlm) {
      structuredLlm = createStructuredLlm();
    }

    if (!structuredLlm) {
      throw new Error("OPENAI_API_KEY is missing; cannot calculate LLM match score.");
    }

    const resumeSnippet = String(resumeText || "").slice(0, 8000);
    const jobSnippet = String(jobDetails || "").slice(0, 6000);

    const prompt = `
      Evaluate the match between a candidate's resume and a job description.
      - Use the candidate's skills, experience, and preferences from the resume.
      - Match them against the job title, description, and requirements in detail.
      - Return a single float score between 0 and 100, where 100 indicates a perfect match and 0 indicates no match.
      - Output the result as a JSON object with the "score" key.

      Resume Text: ${resumeSnippet}
      Job Details: ${jobSnippet}
    `;

    const { score } = await structuredLlm.invoke(prompt);
    const normalized = normalizeScore(score);
    console.log("Calculated Match Score:", normalized);
    return normalized;
  } catch (error) {
    console.error("Error calculating match score:", error);
    throw error;
  }
}
