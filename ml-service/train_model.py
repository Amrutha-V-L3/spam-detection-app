import csv
from collections import Counter
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

SERVICE_DIR = Path(__file__).parent
DATA_PATH = SERVICE_DIR / "data" / "messages.csv"
MODEL_PATH = SERVICE_DIR / "model" / "spam_classifier.joblib"
ALLOWED_LABELS = {"Spam", "Not Spam"}


def load_training_data() -> tuple[list[str], list[str]]:
    messages = []
    labels = []

    with DATA_PATH.open(encoding="utf-8", newline="") as data_file:
        reader = csv.DictReader(data_file)
        if reader.fieldnames is None or not {"message", "label"}.issubset(reader.fieldnames):
            raise ValueError("Training CSV must contain message and label columns.")

        for row_number, row in enumerate(reader, start=2):
            message = (row.get("message") or "").strip()
            label = (row.get("label") or "").strip()
            if not message or label not in ALLOWED_LABELS:
                raise ValueError(f"Invalid message or label on CSV row {row_number}.")
            messages.append(message)
            labels.append(label)

    label_counts = Counter(labels)
    if len(label_counts) != 2 or min(label_counts.values()) < 2:
        raise ValueError("Training data needs at least two messages for each allowed label.")

    return messages, labels


def train_model() -> None:
    messages, labels = load_training_data()
    training_messages, test_messages, training_labels, test_labels = train_test_split(
        messages,
        labels,
        test_size=0.25,
        random_state=42,
        stratify=labels,
    )

    classifier = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), lowercase=True)),
            ("naive_bayes", MultinomialNB()),
        ]
    )
    classifier.fit(training_messages, training_labels)

    predicted_labels = classifier.predict(test_messages)
    print(f"Validation accuracy: {accuracy_score(test_labels, predicted_labels):.2%}")
    print(classification_report(test_labels, predicted_labels, zero_division=0))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(classifier, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    train_model()