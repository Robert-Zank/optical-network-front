from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np

# App Setup
app = FastAPI()

# Allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model
model = joblib.load("backend/model/JohnsonSB_Model.joblib")

# Request Schema
class Node(BaseModel):
    lat: float
    lng: float

class PredictRequest(BaseModel):
    nodes: list[Node]

# Route
@app.post("/predict")
def predict(req: PredictRequest):

    if len(req.nodes) == 0:
        return {"error": "No nodes provided"}

    lats = [n.lat for n in req.nodes]
    lngs = [n.lng for n in req.nodes]

    # Got to make these he params that our model wants
    features = np.array([[
        np.mean(lats),
        np.mean(lngs),
        len(req.nodes)
    ]])

    prediction = model.predict(features)[0]

    return {
        "gamma": float(prediction[0]),
        "delta": float(prediction[1]),
        "lambda": float(prediction[2]),
        "xi": float(prediction[3])
    }