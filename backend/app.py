from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np

# Try and have 2 different Input options available: CSV file of data of all the nodes and the map idea
# Should do Both, both would be nice to use
# Initialize FastAPI app
app = FastAPI()

# Input schema
class PredictRequest(BaseModel):
    node_count: int
    convex_area: float
    perimeter: float

# Load model
model = joblib.load("backend/model/JohnsonSB_Model.joblib")

@app.post("/predict")
def predict(req: PredictRequest):
    # Features: [Node Count, Area, Perimeter]
    features = np.array([[
        req.node_count,
        req.convex_area,
        req.perimeter
    ]])

    # Predict using the loaded model
    prediction = model.predict(features)[0]

    # if we have the output of the model to binary then we assign variable depending on the output
    is_good = bool(prediction == 1) 

    # Return the result as JSON
    return {
        "is_good": is_good,
        "message": "Network configuration is optimal" if is_good else "Network configuration needs improvement"
    }