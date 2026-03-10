from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from sklearn.base import BaseEstimator, TransformerMixin
import sys
import __main__


# --- THE REAL FIX ---
# We define the EXACT class used in your notebook
class DropCorrelatedFeatures(BaseEstimator, TransformerMixin):
    def __init__(self, threshold=0.95):
        self.threshold = threshold
        self.to_drop = []

    def fit(self, X, y=None):
        if hasattr(X, "toarray"): 
            X = X.toarray()
        
        # This calculates which columns are redundant
        corr_matrix = pd.DataFrame(X).corr().abs()
        upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        
        self.to_drop = [column for column in upper.columns if any(upper[column] > self.threshold)]
        return self

    def transform(self, X):
        if hasattr(X, "toarray"):
            X = X.toarray()
        # This physically removes the columns so the model gets the right count
        return np.delete(X, self.to_drop, axis=1)

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
    edge_Density_km_per_km2: float
    MST_Length_km : float
    MST_CV: float
    Meannndist_Km: float
    Centroid_CV: float
    Shape_Factor: float
    node_density_nodes_per_km2: float
    avg_unweighted_path: float
    deg_cv: float
    avg_clustering_coeff: float
    graph_diameter: float
    convex_area_bin: float
    perimeter_bin: float

# Load ML model - This should now work without the AttributeError!
try:
    model = joblib.load("model/JohnsonSB_Model.joblib")
    print("✅ Model loaded successfully!")
    feature_names = [
    "Num_Nodes", "Num_Center_Nodes", "Centrality_ratio",
    "Num_Periphery_Nodes", "Convex_Area", "Sqrt_Convex_Area",
    "T_Ratio", "Perimeter_SqrtArea_Ratio", "Perimeter", "Edge_Density_km_per_km2", "MST_Length_km", "MST_CV",
    "Mean_NN_Dist_km", "Centroid_CV", "Shape_Factor", "Node_Density_nodes_per_km2", "Avg_Unweighted_Path",
    "Degree_CV", "Avg_Clustering_Coefficient", "Graph_Diameter", "Convex_Area_Bin", "Perimeter_Bin"
    ]

    # 2. Reach inside the model and manually set the 'feature_names_in_'
    # This fixes the 'NoneType is not iterable' error
    if hasattr(model, 'steps'):
        # If it's a Pipeline, we set it on the first step (the transformer)
        model.steps[0][1].feature_names_in_ = np.array(feature_names)
    else:
        model.feature_names_in_ = np.array(feature_names)
except Exception as e:
    print(f"❌ Error loading model: {e}")

@app.post("/predict")
def predict(req: PredictRequest):
    # Convert incoming JSON data to a 2D Numpy array for the model
    data = {
        "Num_Nodes": [req.num_nodes],
        "Num_Center_Nodes": [req.num_center_nodes],
        "Centrality_ratio": [req.centrality_ratio],
        "Num_Periphery_Nodes": [req.num_periphery_nodes],
        "Convex_Area": [req.convex_area],
        "Sqrt_Convex_Area": [req.sqrt_convex_area],
        "T_Ratio": [req.t_ratio],
        "Perimeter_SqrtArea_Ratio": [req.perimeter_sqrtarea_ratio],
        "Perimeter": [req.perimeter],
        "Edge_Density_km_per_km2": [req.edge_Density_km_per_km2],
        "MST_Length_km": [req.MST_Length_km],
        "MST_CV": [req.MST_CV],
        "Mean_NN_Dist_km": [req.Meannndist_Km],
        "Centroid_CV": [req.Centroid_CV],
        "Shape_Factor": [req.Shape_Factor],
        "Node_Density_nodes_per_km2": [req.node_density_nodes_per_km2],
        "Avg_Unweighted_Path": [req.avg_unweighted_path],
        "Degree_CV": [req.deg_cv],
        "Avg_Clustering_Coefficient": [req.avg_clustering_coeff],
        "Graph_Diameter": [req.graph_diameter],
        "Convex_Area_Bin": [req.convex_area_bin],
        "Perimeter_Bin": [req.perimeter_bin]
    }

    # 3. Convert to a DataFrame (the "Named" format)
    features_df = pd.DataFrame(data)

    # 4. Predict using the DataFrame instead of a NumPy array
    prediction = model.predict(features_df)

    result = prediction.flatten().tolist()
    return {"result": result}