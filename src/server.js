import express from "express";
import multer from "multer";
import path from "path";
import "./loadEnv.js";
import { parsePDF } from "./processPDF.js";
import { basicExtractResumeDetails, extractResumeDetails } from "./resumeExtractor.js";
import { searchJobs } from "./jobSearch.js";

const app = express();
const upload = multer({ dest: "uploads/" });

let structuredResumeData = {};
let extractedResumeText = ""; // Global variable for full resume text

// Middleware
app.use(express.json());
app.use(express.static("frontend/dist/frontend/browser")); // Serve Angular build

// Endpoint to upload PDF and extract text
app.post("/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    extractedResumeText = await parsePDF(req.file.path); // Save extracted text globally

    let warning = null;
    try {
      structuredResumeData = await extractResumeDetails(extractedResumeText);
    } catch (err) {
      warning =
        err instanceof Error ? err.message : "Failed to extract structured resume details.";
      structuredResumeData = basicExtractResumeDetails(extractedResumeText);
    }

    res.json({
      message: "PDF uploaded and structured data extracted successfully",
      data: structuredResumeData,
      warning,
    });
  } catch (error) {
    console.error("Error processing PDF:", error.message);
    res.status(500).json({ error: "Failed to parse the PDF or extract structured data" });
  }
});

// Endpoint to find jobs based on structured resume data
app.post("/find-jobs", async (req, res) => {
  try {
    if (!structuredResumeData || !structuredResumeData.title || !extractedResumeText) {
      return res.status(400).json({
        error: "Upload a resume first to extract structured data for job search.",
      });
    }

    // Pass the full resume text to the job search
    const jobs = await searchJobs({
      ...structuredResumeData,
      resumeText: extractedResumeText, // Use global variable for resume text
    });

    res.json({ jobs });
  } catch (error) {
    console.error("Error finding jobs:", error.message);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Serve index.html for all other routes to support Angular routing
app.get("*", (req, res) => {
  res.sendFile(path.resolve("frontend/dist/frontend/browser/index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
