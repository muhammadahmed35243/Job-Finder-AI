import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import { parsePDF } from "./processPDF.js";
import { extractResumeDetails } from "./resumeExtractor.js";
import { searchJobs } from "./jobSearch.js";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

let structuredResumeData = {};
let extractedResumeText = ""; // Global variable for full resume text

// Middleware
app.use(express.json());
app.use(express.static("frontend/dist/frontend/browser")); // Serve Angular build

// Serve index.html for all routes to support Angular routing
app.get("*", (req, res) => {
  // Skip API routes
  if (req.path.startsWith("/upload-pdf") || req.path.startsWith("/find-jobs")) {
    return;
  }
  res.sendFile(path.resolve("frontend/dist/frontend/browser/index.html"));
});

// Endpoint to upload PDF and extract text
app.post("/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    extractedResumeText = await parsePDF(req.file.path); // Save extracted text globally
    structuredResumeData = await extractResumeDetails(extractedResumeText);

    res.json({
      message: "PDF uploaded and structured data extracted successfully",
      data: structuredResumeData,
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
