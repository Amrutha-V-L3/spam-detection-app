const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const pythonPredictionUrl = process.env.PYTHON_API_URL || "http://127.0.0.1:8000/predict";
const maxMessageLength = 500;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.post("/api/predict", async (request, response) => {
  const { message } = request.body || {};

  if (typeof message !== "string" || message.trim().length === 0) {
    return response.status(400).json({ error: "Enter a non-empty message." });
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length > maxMessageLength) {
    return response.status(400).json({ error: "Message must be 500 characters or fewer." });
  }

  let modelResponse;
  try {
    modelResponse = await fetch(pythonPredictionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmedMessage }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      return response.status(504).json({ error: "The prediction service timed out." });
    }
    return response.status(503).json({ error: "The prediction service is unavailable." });
  }

  if (!modelResponse.ok) {
    return response.status(502).json({ error: "The prediction service returned an error." });
  }

  let prediction;
  try {
    prediction = await modelResponse.json();
  } catch (_error) {
    return response.status(502).json({ error: "The prediction service returned invalid data." });
  }

  if (
    !prediction ||
    !["Spam", "Not Spam"].includes(prediction.label) ||
    typeof prediction.confidence !== "number" ||
    !Number.isFinite(prediction.confidence) ||
    prediction.confidence < 0 ||
    prediction.confidence > 1
  ) {
    return response.status(502).json({ error: "The prediction service returned invalid data." });
  }

  return response.status(200).json(prediction);
});

app.use((error, _request, response, _next) => {
  if (error.type === "entity.parse.failed") {
    return response.status(400).json({ error: "Request body must be valid JSON." });
  }

  if (error.type === "entity.too.large") {
    return response.status(413).json({ error: "Request body is too large." });
  }

  console.error(error);
  return response.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(port, () => {
  console.log(`Express server listening on http://localhost:${port}`);
});