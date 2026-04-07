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
import math
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

# Input schema (Must match the keys sent from React)
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

# -----------------------------
# Cost model assumptions
# -----------------------------

TRANSPONDER_COSTS = {
    "16QAM": 4000,
    "8QAM": 7000,
    "QPSK": 10000,
    "BPSK": 15000,
}

BOOSTERS_PER_BUCKET = {
    "16QAM": 0,
    "8QAM": 1,
    "QPSK": 2,
    "BPSK": 4,
}

BOOSTER_COST = 3000


def estimate_network_cost(num_nodes, gamma, delta, lam, xi):
    # Create Johnson SB distribution
    dist = johnsonsb(a=gamma, b=delta, loc=xi, scale=lam)

    # Probability of paths in each modulation / distance range
    p_16qam = max(0.0, dist.cdf(375) - dist.cdf(0))
    p_8qam = max(0.0, dist.cdf(750) - dist.cdf(375))
    p_qpsk = max(0.0, dist.cdf(1500) - dist.cdf(750))
    p_bpsk = max(0.0, dist.cdf(lam + xi) - dist.cdf(1500))

    # Total unordered node-pair paths
    total_paths = comb(num_nodes, 2)

    probabilities = {
        "16QAM": p_16qam,
        "8QAM": p_8qam,
        "QPSK": p_qpsk,
        "BPSK": p_bpsk,
    }

    # Step 1: raw counts
    raw_counts = {k: total_paths * probabilities[k] for k in probabilities}

    # Step 2: floor everything
    path_counts = {k: math.floor(raw_counts[k]) for k in probabilities}

    # Step 3: distribute leftover paths by largest fractional remainder
    used = sum(path_counts.values())
    remaining = total_paths - used

    remainders = sorted(
        probabilities.keys(),
        key=lambda k: raw_counts[k] - path_counts[k],
        reverse=True
    )

    for i in range(remaining):
        path_counts[remainders[i]] += 1

    # Safety guard
    for k in path_counts:
        path_counts[k] = max(0, path_counts[k])

    # Fixed booster assumptions per bucket
    booster_counts = {
        bucket: path_counts[bucket] * BOOSTERS_PER_BUCKET[bucket]
        for bucket in path_counts
    }

    # Cost calculations
    transponder_total = sum(
        path_counts[bucket] * 2 * TRANSPONDER_COSTS[bucket]
        for bucket in path_counts
    )

    booster_total = sum(booster_counts.values()) * BOOSTER_COST
    total_cost = transponder_total + booster_total

    return {
        "total_paths": total_paths,
        "probabilities": probabilities,
        "path_counts": path_counts,
        "booster_counts": booster_counts,
        "costs": {
            "transponders": transponder_total,
            "boosters": booster_total,
            "total": total_cost,
        },
        "assumptions": {
            "path_ranges_km": {
                "16QAM": [0, 375],
                "8QAM": [375, 750],
                "QPSK": [750, 1500],
                "BPSK": [1500, lam + xi],
            },
            "boosters_per_bucket": BOOSTERS_PER_BUCKET,
            "booster_cost": BOOSTER_COST,
            "transponder_costs": TRANSPONDER_COSTS,
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