import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import "./loadEnv.js";

const resumeSchema = z.object({
  title: z.string().describe("Current job title of the candidate"),
  location: z.string().describe("Preferred job location (Country Code)"),
  workFromHomePreference: z
    .boolean()
    .describe("Does the candidate prefer to work from home?"),
  degree: z.boolean().describe("Does the candidate have a degree?"),
});

function createStructuredLlm() {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
    openAIApiKey: apiKey,
  });

  return model.withStructuredOutput(resumeSchema);
}

let structuredLlm = null;
let llmDisabled = false;

function guessTitle(text) {
  const haystack = String(text || "").toLowerCase();
  const candidates = [
    "software engineer",
    "frontend developer",
    "backend developer",
    "full stack developer",
    "web developer",
    "mobile developer",
    "data analyst",
    "data scientist",
    "devops engineer",
    "qa engineer",
    "product manager",
    "ui/ux designer",
    "graphic designer",
  ];

  for (const c of candidates) {
    if (haystack.includes(c)) return c.replace(/\b\w/g, (m) => m.toUpperCase());
  }

  return "Software Engineer";
}

function guessDegree(text) {
  const haystack = String(text || "").toLowerCase();
  return (
    haystack.includes("bachelor") ||
    haystack.includes("bs ") ||
    haystack.includes("b.s") ||
    haystack.includes("bsc") ||
    haystack.includes("master") ||
    haystack.includes("ms ") ||
    haystack.includes("m.s") ||
    haystack.includes("msc") ||
    haystack.includes("phd") ||
    haystack.includes("doctorate")
  );
}

export function basicExtractResumeDetails(extractedText) {
  return {
    title: guessTitle(extractedText),
    location: (process.env.DEFAULT_JOB_LOCATION || "").trim(),
    workFromHomePreference: false,
    degree: guessDegree(extractedText),
    _source: "basic",
  };
}

/**
 * Extract structured details from resume text.
 *
 * @param {string} extractedText - Text extracted from the PDF.
 * @returns {Promise<object>} - Structured data.
 */
export async function extractResumeDetails(extractedText) {
  try {
    const textSnippet = String(extractedText || "").slice(0, 12000);

    if (process.env.DISABLE_RESUME_EXTRACTION_LLM === "true") {
      return basicExtractResumeDetails(textSnippet);
    }

    if (llmDisabled) {
      return basicExtractResumeDetails(textSnippet);
    }

    if (!structuredLlm) {
      structuredLlm = createStructuredLlm();
    }

    if (!structuredLlm) {
      throw new Error("OPENAI_API_KEY is missing; cannot extract resume details.");
    }

    const structuredData = await structuredLlm.invoke(
      `Extract the following details from the resume text: ${textSnippet}`
    );

    const normalized = {
      title: typeof structuredData?.title === "string" && structuredData.title.trim()
        ? structuredData.title.trim()
        : guessTitle(textSnippet),
      location: typeof structuredData?.location === "string" ? structuredData.location.trim() : "",
      workFromHomePreference: Boolean(structuredData?.workFromHomePreference),
      degree: Boolean(structuredData?.degree),
      _source: "llm",
    };

    console.log("Extracted Data: ", normalized);
    return normalized;
  } catch (error) {
    const status = error?.status ?? error?.response?.status;
    const code = error?.code ?? error?.error?.code;

    if (status === 401 || code === "invalid_api_key" || error?.lc_error_code === "MODEL_AUTHENTICATION") {
      llmDisabled = true;
      console.error(
        "Resume LLM extraction disabled due to authentication error (check OPENAI_API_KEY). Using basic extraction."
      );
      return basicExtractResumeDetails(extractedText);
    }

    console.error("Error extracting resume details:", error);
    throw error;
  }
}
