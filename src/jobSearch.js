import axios from "axios";
import "./loadEnv.js";
import { calculateMatchScore } from "./jobMatcher.js";

const DEFAULT_MIN_SCORE = Number(process.env.MIN_JOB_MATCH_SCORE ?? 50);
const MAX_JOBS_TO_SCORE = Number(process.env.MAX_JOBS_TO_SCORE ?? 10);
const MAX_RECOMMENDATIONS = Number(process.env.MAX_JOB_RECOMMENDATIONS ?? 10);

function basicTextScore(resumeText, jobDetails) {
  const resume = (resumeText || "").toLowerCase();
  const job = (jobDetails || "").toLowerCase();
  if (!resume || !job) return 0;

  // Very lightweight heuristic: keyword overlap from the job text into the resume.
  const words = job
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);

  if (words.length === 0) return 0;

  const unique = Array.from(new Set(words)).slice(0, 80);
  const hits = unique.reduce((count, w) => (resume.includes(w) ? count + 1 : count), 0);
  return Math.round((hits / unique.length) * 100);
}

/**
 * Search jobs using structured resume data.
 *
 * @param {object} params - Structured data with title, location, work-from-home preference, and degree information.
 * @param {string} resumeText - Full extracted resume text.
 * @returns {Promise<object[]>} - Filtered job results.
 */
export async function searchJobs({
  title,
  location,
  workFromHomePreference,
  degree,
  resumeText,
}) {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
      throw new Error("API key is missing. Set SERPAPI_API_KEY in your .env file.");
    }

    const queryTitle = typeof title === "string" ? title.trim() : "";
    const queryLocation = typeof location === "string" ? location.trim() : "";

    if (!queryTitle) {
      throw new Error("Missing resume title; cannot search jobs.");
    }

    const queryParams = {
      engine: "google_jobs",
      q: queryTitle,
      hl: "en",
      api_key: apiKey,
    };

    // If location looks like a real place (not a short country code), include it in the query.
    if (queryLocation && queryLocation.length > 2) {
      queryParams.q = `${queryTitle} ${queryLocation}`;
    }

    // Add filter for work-from-home if applicable
    if (workFromHomePreference) {
      queryParams.ltype = "1";
    }

    const response = await axios.get("https://serpapi.com/search.json", {
      params: queryParams,
    });

    let jobs = response.data?.jobs_results || [];

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return [];
    }

    // Filter out jobs requiring a degree if the candidate doesn't have one
    if (!degree) {
      jobs = jobs.filter(
        (job) =>
          !job.detected_extensions?.qualifications?.toLowerCase().includes("degree")
      );
    }

    // Calculate match scores for (a limited number of) jobs to keep latency/cost reasonable.
    const jobsToScore = jobs.slice(0, Math.max(1, MAX_JOBS_TO_SCORE));
    const scoredJobs = await Promise.all(
      jobsToScore.map(async (job) => {
        const jobDetails = `${job.title || ""} ${job.company_name || ""} ${job.location || ""} ${
          job.description || ""
        }`;

        try {
          const score = await calculateMatchScore(resumeText, jobDetails);
          return { ...job, score, _scoreSource: "llm" };
        } catch {
          const score = basicTextScore(resumeText, jobDetails);
          return { ...job, score, _scoreSource: "basic" };
        }
      })
    );

    // Prefer high scores, but never return an empty list if SerpAPI found results.
    const sorted = scoredJobs
      .filter((j) => typeof j.score === "number" && !Number.isNaN(j.score))
      .sort((a, b) => b.score - a.score);

    let selected = sorted.filter((job) => job.score >= DEFAULT_MIN_SCORE);
    if (selected.length === 0) {
      selected = sorted.slice(0, Math.max(1, Math.min(MAX_RECOMMENDATIONS, sorted.length)));
    }

    // Return structured results
    return selected.slice(0, Math.max(1, MAX_RECOMMENDATIONS)).map((job) => ({
      title: job.title,
      company: job.company_name,
      location: job.location,
      postedAt: job.detected_extensions?.posted_at,
      workFromHome: job.detected_extensions?.work_from_home || false,
      applyLink: job.apply_options?.[0]?.link,
      thumbnail: job.thumbnail,
    }));
  } catch (error) {
    console.error("Error fetching job results:", error.message);
    throw error;
  }
}
