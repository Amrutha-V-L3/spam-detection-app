# AI Spam Detection

A small learning project that screens a text message with a TF-IDF and Multinomial Naive Bayes classifier. The browser sends the message to an Express API, which forwards it to a FastAPI prediction service.

## Architecture

```text
Browser (HTML, CSS, JavaScript)
  -> Express (Node.js, port 3000)
      -> FastAPI (Python, port 8000)
          -> scikit-learn TF-IDF + Multinomial Naive Bayes pipeline
```

## Project Structure

```text
spam-detection-app/
  backend/
    server.js
  ml-service/
    data/
      messages.csv
    model/                 Generated model is saved here
    main.py                FastAPI application
    requirements.txt
    train_model.py
  public/
    app.js
    index.html
    styles.css
  package.json
  README.md
```

## Prerequisites

- Node.js 18 or later, including npm
- Python 3.12 (the commands below use the Windows `py` launcher)

## Setup

Run these commands from the project root in PowerShell:

```powershell
npm install
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ml-service\requirements.txt
```

## Train the Model

The included CSV is a small, hand-written demo dataset. Train the model with:

```powershell
.\.venv\Scripts\python.exe ml-service\train_model.py
```

The script prints holdout metrics and writes `ml-service/model/spam_classifier.joblib`. The FastAPI service loads the model when it starts, so retrainings require restarting that service.

## Run the Application

Start the FastAPI service in the first terminal, from the project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir ml-service --reload --host 127.0.0.1 --port 8000
```

Start Express in a second terminal, also from the project root:

```powershell
npm start
```

Open <http://localhost:3000/> to use the message screening page. To use a different FastAPI address, set `PYTHON_API_URL` before starting Express:

```powershell
$env:PYTHON_API_URL = "http://127.0.0.1:8001/predict"
npm start
```

## Check the Services

Check Express health:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Check FastAPI health and confirm the model is loaded:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Send a message directly to FastAPI:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:8000/predict `
  -ContentType "application/json" `
  -Body (@{ message = "Congratulations, claim your free prize now." } | ConvertTo-Json)
```

Send a message through Express, following the same route used by the browser:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/api/predict `
  -ContentType "application/json" `
  -Body (@{ message = "Are we still meeting for lunch tomorrow?" } | ConvertTo-Json)
```

Successful predictions return a label (`Spam` or `Not Spam`) and a confidence value between `0` and `1`. Express rejects empty messages and messages longer than 500 characters. It returns an error if FastAPI is unavailable, times out, or responds with an invalid prediction.

## Limitations

- The included dataset has only 60 examples and is intended to demonstrate the training workflow. Its validation score does not predict real-world performance. Replace it with a larger, representative, appropriately licensed dataset before relying on classifications.
- Confidence is the model's highest predicted class probability; it is not a guarantee that the classification is correct.
- Avoid sending private or sensitive messages to this learning application.
- Only load model files you trust. Joblib model files use Python object serialization and should be treated as trusted local artifacts.