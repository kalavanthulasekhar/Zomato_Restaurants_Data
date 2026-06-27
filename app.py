from flask import Flask, render_template, request, jsonify
import joblib
import pandas as pd
import re
import os

from nltk.corpus import stopwords
from nltk.stem import PorterStemmer


import nltk

try:
    nltk.data.find("corpora/stopwords")
except LookupError:
    nltk.download("stopwords")

try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")


app = Flask(__name__)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "best_sentiment_model.joblib"
)

TFIDF_PATH = os.path.join(
    BASE_DIR,
    "models",
    "tfidf_vectorizer.joblib"
)

DATASET_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "merged_restaurant_dataset.csv"
)


model = joblib.load(MODEL_PATH)

tfidf = joblib.load(TFIDF_PATH)

df = pd.read_csv(DATASET_PATH)

print("Files Loaded Successfully")


stemmer = PorterStemmer()

stop_words = set(stopwords.words("english"))

def clean_text(text):

    text = text.lower()

    text = re.sub(r'[^a-zA-Z]', ' ', text)

    words = text.split()

    words = [
        stemmer.stem(word)
        for word in words
        if word not in stop_words
    ]

    return " ".join(words)


@app.route("/")
def home():

    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    review = data["review"]

    clean_review = clean_text(review)

    vector = tfidf.transform([clean_review])

    prediction = model.predict(vector)[0]

    probability = model.predict_proba(vector)[0]

    confidence = round(max(probability) * 100, 2)

    sentiment = "Positive 😊"

    if prediction == 0:
        sentiment = "Negative 😞"

    return jsonify({

        "review": review,

        "prediction": sentiment,

        "confidence": confidence

    })


@app.route("/search")
def search():

    restaurant = request.args.get("restaurant")

    result = df[
        df["Restaurant_review"]
        .str.contains(
            restaurant,
            case=False,
            na=False
        )
    ]

    if result.empty:

        return jsonify({

            "message": "Restaurant Not Found"

        })

    result = result.iloc[0]

    return jsonify({

        "Restaurant": result["Restaurant_review"],

        "Cuisine": result["Cuisines"],

        "Cost": result["Cost"],

        "Collections": result["Collections"],

        "Timings": result["Timings"],

        "Average Rating": float(result["Average_Rating"]),

        "Reviews": int(result["Review_Count"])

    })


@app.route("/top_restaurants")
def top_restaurants():

    top = (

        df.groupby("Restaurant_review")

        .agg({

            "Average_Rating":"mean",

            "Review_Count":"mean"

        })

        .sort_values(

            by="Average_Rating",

            ascending=False

        )

        .head(10)

        .reset_index()

    )

    return top.to_json(

        orient="records"

    )


@app.route("/dashboard")
def dashboard():

    total_restaurants = df["Restaurant_review"].nunique()

    total_reviews = len(df)

    avg_rating = round(

        df["Rating"].mean(),

        2

    )

    positive = len(

        df[df["Sentiment"] == 1]

    )

    negative = len(

        df[df["Sentiment"] == 0]

    )

    return jsonify({

        "Restaurants": total_restaurants,

        "Reviews": total_reviews,

        "Average Rating": avg_rating,

        "Positive Reviews": positive,

        "Negative Reviews": negative

    })


@app.route("/recommend")
def recommend():

    cuisine = request.args.get("cuisine")

    data = df[

        df["Cuisines"]

        .str.contains(

            cuisine,

            case=False,

            na=False

        )

    ]

    data = data[

        [

            "Restaurant_review",

            "Average_Rating",

            "Cost"

        ]

    ]

    data = data.drop_duplicates()

    data = data.sort_values(

        by="Average_Rating",

        ascending=False

    )

    return data.head(10).to_json(

        orient="records"

    )


import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
