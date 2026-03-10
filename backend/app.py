from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
import sys


# --- FIX FOR THE ATTRIBUTE ERROR ---
# We define the class the model is looking for so it doesn't crash on load.
class DropCorrelatedFeatures:
    def __init__(self, *args, **kwargs):
        pass
    def transform(self, X):
        return X
    def fit(self, X, y=None):
        return self

def symlog_transform(x):
    return np.sign(x) * np.log1p(np.abs(x))

def symlog_inverse(x):
    return np.sign(x) * (np.expm1(np.abs(x)))
# This attaches the class to the "main" script so joblib can find it
import __main__
__main__.DropCorrelatedFeatures = DropCorrelatedFeatures
__main__.symlog_transform = symlog_transform
__main__.symlog_inverse = symlog_inverse
# -----------------------------------

app = FastAPI()

# Allow frontend (React/Vite) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input schema (Must match the keys you send from React)
class PredictRequest(BaseModel):
    num_nodes: int
    num_center_nodes: int
    centrality_ratio: float
    num_periphery_nodes: int
    convex_area: float
    sqrt_convex_area: float
    t_ratio: float
    perimeter_sqrtarea_ratio: float
    perimeter: float

# Load ML model - This should now work without the AttributeError!
try:
    model = joblib.load("model/JohnsonSB_Model.joblib")
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")

@app.post("/predict")
def predict(req: PredictRequest):
    # Convert incoming JSON data to a 2D Numpy array for the model
    features = np.array([[
        req.num_nodes,
        req.num_center_nodes,
        req.centrality_ratio,
        req.num_periphery_nodes,
        req.convex_area,
        req.sqrt_convex_area,
        req.t_ratio,
        req.perimeter_sqrtarea_ratio,
        req.perimeter
    ]])

    # Get model prediction [gamma, delta, lambda, xi]
    prediction = model.predict(features)

    # Flatten the result to a simple list [num1, num2, num3, num4]
    result = prediction.flatten().tolist()

    return {"result": result}