from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from sklearn.base import BaseEstimator, TransformerMixin
from scipy.stats import johnsonsb
from math import comb, ceil
import sys
import __main__

# Need to Install fastapi, pandas, joblib, scikit-learn, uvicorn
# Run with: uvicorn app:app --reload
# Make sure to run with python version 3.12 because of sckit-learn compatibility with the model


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

def estimate_network_cost(num_nodes, gamma, delta, lam, xi):
    # Johnson SB distribution
    dist = johnsonsb(a=gamma, b=delta, loc=xi, scale=lam)

    # Distance buckets (km)
    p_16qam = max(0.0, dist.cdf(375) - dist.cdf(0))
    p_8qam  = max(0.0, dist.cdf(750) - dist.cdf(375))
    p_qpsk  = max(0.0, dist.cdf(1500) - dist.cdf(750))
    p_bpsk  = max(0.0, dist.cdf(lam + xi) - dist.cdf(1500))

    # Total unordered node-pair paths
    total_paths = comb(num_nodes, 2)

    n_16qam = round(total_paths * p_16qam)
    n_8qam  = round(total_paths * p_8qam)
    n_qpsk  = round(total_paths * p_qpsk)

    # force totals to add up cleanly
    n_bpsk = total_paths - n_16qam - n_8qam - n_qpsk

    # Example cost assumptions — replace with your real numbers
    transponder_costs = {
        "16QAM": 8000,
        "8QAM": 12000,
        "QPSK": 18000,
        "BPSK": 25000,
    }

    # Example amplifier/booster assumptions
    # assume one booster roughly every 80 km after the first span
    def boosters_needed(path_length_km):
        if path_length_km <= 80:
            return 0
        return max(0, ceil(path_length_km / 80) - 1)

    booster_cost = 3000

    # Representative path lengths for each bucket
    representative_lengths = {
        "16QAM": 187.5,
        "8QAM": 562.5,
        "QPSK": 1125.0,
        "BPSK": max(1500.0, (lam + xi + 1500) / 2),
    }

    counts = {
        "16QAM": n_16qam,
        "8QAM": n_8qam,
        "QPSK": n_qpsk,
        "BPSK": n_bpsk,
    }

    transponder_total = 0
    booster_total = 0
    booster_counts = {}

    for mod, count in counts.items():
        length = representative_lengths[mod]
        boosters_per_path = boosters_needed(length)
        booster_counts[mod] = count * boosters_per_path

        # if each path needs two endpoints, multiply transponder cost by 2
        transponder_total += count * 2 * transponder_costs[mod]
        booster_total += booster_counts[mod] * booster_cost

    total_cost = transponder_total + booster_total

    return {
        "total_paths": total_paths,
        "probabilities": {
            "16QAM": p_16qam,
            "8QAM": p_8qam,
            "QPSK": p_qpsk,
            "BPSK": p_bpsk,
        },
        "path_counts": counts,
        "booster_counts": booster_counts,
        "costs": {
            "transponders": transponder_total,
            "boosters": booster_total,
            "total": total_cost,
        },
    }

@app.post("/predict")
def predict(req: PredictRequest):
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

    features_df = pd.DataFrame(data)
    prediction = model.predict(features_df)
    result = prediction.flatten().tolist()

    gamma, delta, lam, xi = result

    cost_estimate = estimate_network_cost(
        num_nodes=req.num_nodes,
        gamma=gamma,
        delta=delta,
        lam=lam,
        xi=xi,
    )

    return {
        "result": result,
        "cost_estimate": cost_estimate,
    }