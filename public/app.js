const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const characterCount = document.querySelector("#character-count");
const resultContent = document.querySelector("#result-content");
const checkButton = document.querySelector("#check-button");
const buttonLabel = document.querySelector("#button-label");

function renderResult(index, label, description, state = "") {
  resultContent.className = `result-content ${state}`.trim();

  const resultIndex = document.createElement("span");
  resultIndex.className = "result-index";
  resultIndex.setAttribute("aria-hidden", "true");
  resultIndex.textContent = index;

  const resultLabel = document.createElement("p");
  resultLabel.className = "result-label";
  resultLabel.textContent = label;

  const resultDescription = document.createElement("p");
  resultDescription.className = "result-description";
  resultDescription.textContent = description;

  resultContent.replaceChildren(resultIndex, resultLabel, resultDescription);
}

messageInput.addEventListener("input", () => {
  characterCount.textContent = String(messageInput.value.length);
  messageInput.setCustomValidity("");
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (!message) {
    messageInput.setCustomValidity("Enter a message before requesting a check.");
    messageInput.reportValidity();
    return;
  }

  checkButton.disabled = true;
  messageForm.setAttribute("aria-busy", "true");
  buttonLabel.textContent = "Checking...";
  renderResult("--", "REQUEST IN PROGRESS", "Waiting for the prediction service.", "is-pending");

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const prediction = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(prediction?.error || "The message could not be checked.");
    }

    if (
      !prediction ||
      typeof prediction.label !== "string" ||
      typeof prediction.confidence !== "number"
    ) {
      throw new Error("The prediction service returned an invalid response.");
    }

    const confidence = Math.round(prediction.confidence * 100);
    renderResult("01", prediction.label.toUpperCase(), `Confidence: ${confidence}%`);
  } catch (error) {
    renderResult("!", "CHECK UNAVAILABLE", error.message, "is-error");
  } finally {
    checkButton.disabled = false;
    messageForm.removeAttribute("aria-busy");
    buttonLabel.textContent = "Check message";
  }
});