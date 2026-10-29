import logging
import math
from pathlib import Path
from typing import Literal

import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "model" / "spam_classifier.joblib"


def load_classifier():
    if not MODEL_PATH.is_file():
        return None

    try:
        return joblib.load(MODEL_PATH)
    except Exception:
        logger.exception("Could not load the spam classifier.")
        return None


classifier = load_classifier()
app = FastAPI(title="Spam Detection Service", version="1.0.0")


class PredictionRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class PredictionResponse(BaseModel):
    label: Literal["Spam", "Not Spam"]
    confidence: float = Field(ge=0, le=1)


@app.get("/health")
def health_check() -> dict[str, str | bool]:
    return {"status": "ok", "model_loaded": classifier is not None}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message must not be blank.")

    if classifier is None:
        raise HTTPException(status_code=503, detail="Classifier model is not trained yet.")

    try:
        label = str(classifier.predict([message])[0])
        probabilities = classifier.predict_proba([message])[0]
        confidence = float(max(probabilities))
    except Exception as error:
        logger.exception("Spam classification failed.")
        raise HTTPException(status_code=500, detail="Model prediction failed.") from error

    if label not in {"Spam", "Not Spam"} or not math.isfinite(confidence):
        raise HTTPException(status_code=500, detail="Model returned an invalid prediction.")

    return PredictionResponse(label=label, confidence=confidence)