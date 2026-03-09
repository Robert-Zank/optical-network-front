from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend to call this API 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input schema
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

# Load ML model
model = joblib.load("model/JohnsonSB_Model.joblib")

@app.post("/predict")
def predict(req: PredictRequest):
    # Convert to 2D array for sklearn
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

    # Get model prediction
    # Assuming your model returns a 1D array with 4 outputs per input
    prediction = model.predict(features)  # shape = (1, 4)

    # Flatten to 1D list for JSON
    result = prediction.flatten().tolist()

    return {"result": result}