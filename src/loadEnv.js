import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Always load `.env` from the repo root (works even if you start Node from `src/`).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

