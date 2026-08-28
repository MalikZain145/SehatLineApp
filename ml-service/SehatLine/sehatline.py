"""The SehatLine model wrapper — load weights, score, and prioritise."""

import os
import json
import numpy as np

from .core import FEATURES, build_matrix, rule_score, level_for
from .model import SehatLineNet

_HERE = os.path.dirname(os.path.abspath(__file__))


class SehatLine:
    """SehatLine deep-learning triage model.

    >>> from SehatLine import SehatLine
    >>> m = SehatLine()
    >>> m.prioritize([{ "age": 78, "conditions": ["heart disease"], "spo2": 89 }])
    """

    def __init__(self, weights_path=None, scaler_path=None):
        self._torch = None
        self._net = None
        self._mean = None
        self._std = None
        self.trained = False

        weights_path = weights_path or os.path.join(_HERE, "weights.pt")
        scaler_path = scaler_path or os.path.join(_HERE, "scaler.json")
        try:
            import torch  # imported lazily so the package imports even w/o torch
            self._torch = torch
            net = SehatLineNet(len(FEATURES))
            net.load_state_dict(torch.load(weights_path, map_location="cpu"))
            net.eval()
            with open(scaler_path, "r") as f:
                meta = json.load(f)
            self._net = net
            self._mean = np.array(meta["mean"], dtype=float)
            self._std = np.array(meta["std"], dtype=float)
            self.trained = True
        except Exception:
            # No weights / no torch → fall back to the clinical rules.
            self.trained = False

    @property
    def engine(self):
        return "SehatLine-DL(pytorch)" if self.trained else "SehatLine-rule-fallback"

    def _predict(self, X):
        if X.shape[0] == 0:
            return np.zeros(0)
        if self.trained:
            Xs = (X - self._mean) / self._std
            with self._torch.no_grad():
                out = self._net(self._torch.tensor(Xs, dtype=self._torch.float32)).numpy()
            return np.clip(out, 0, 100)
        return rule_score(X)

    def score(self, patient):
        s = float(round(float(self._predict(build_matrix([patient]))[0]), 2))
        return {"priorityScore": s, "priorityLevel": level_for(s)}

    def prioritize(self, patients):
        scores = self._predict(build_matrix(patients))
        scored = [
            {"id": p.get("id"), "priorityScore": float(round(float(s), 2)),
             "priorityLevel": level_for(float(s))}
            for p, s in zip(patients, scores)
        ]
        order = sorted(range(len(scored)), key=lambda i: -scored[i]["priorityScore"])
        ranked = []
        for rank, idx in enumerate(order, start=1):
            item = dict(scored[idx])
            item["rank"] = rank
            ranked.append(item)
        return {"engine": self.engine, "count": len(ranked), "ranked": ranked}
