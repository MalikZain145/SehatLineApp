"""
Train the SehatLine deep-learning model (PyTorch) and save its weights into
the package so `from SehatLine import SehatLine` loads them automatically.

Run:  python train_sehatline.py
"""

import os
import json
import time
import numpy as np
import torch
import torch.nn as nn

from SehatLine.core import FEATURES, rule_score
from SehatLine.model import SehatLineNet

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.join(HERE, "SehatLine")
RNG = np.random.default_rng(42)
torch.manual_seed(42)


def synth(n):
    age = RNG.integers(18, 95, n).astype(float)
    is_elderly = (age >= 60).astype(float)
    num_cond = RNG.integers(0, 5, n).astype(float)
    critical = (RNG.random(n) < 0.22).astype(float)

    def maybe(v, p=0.7):
        return np.where(RNG.random(n) < p, v, 0.0)

    systolic = maybe(RNG.normal(128, 22, n).clip(85, 210))
    diastolic = maybe(RNG.normal(82, 14, n).clip(50, 130))
    hr = maybe(RNG.normal(78, 16, n).clip(45, 150))
    spo2 = maybe(RNG.normal(96, 3.2, n).clip(80, 100))
    sugar = maybe(RNG.normal(130, 55, n).clip(60, 360))
    temp = maybe(RNG.normal(98.6, 1.4, n).clip(96, 105))
    pregnant = (RNG.random(n) < 0.06).astype(float)
    disability = (RNG.random(n) < 0.08).astype(float)
    days_since = RNG.integers(0, 120, n).astype(float)
    missed = RNG.integers(0, 5, n).astype(float)
    return np.column_stack([age, is_elderly, num_cond, critical, systolic, diastolic,
                            hr, spo2, sugar, temp, pregnant, disability, days_since, missed])


def r2(y, p):
    ss_res = np.sum((y - p) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    return 1 - ss_res / ss_tot


def main():
    n = 60000
    print(f"Generating {n} synthetic patients...")
    X = synth(n)
    y = np.clip(rule_score(X) + RNG.normal(0, 4.0, n), 0, 100)

    idx = RNG.permutation(n)
    cut = int(n * 0.85)
    tr, te = idx[:cut], idx[cut:]

    mean, std = X[tr].mean(0), X[tr].std(0) + 1e-8
    Xs = (X - mean) / std

    Xtr = torch.tensor(Xs[tr], dtype=torch.float32)
    ytr = torch.tensor(y[tr], dtype=torch.float32)
    Xte = torch.tensor(Xs[te], dtype=torch.float32)

    net = SehatLineNet(len(FEATURES))
    opt = torch.optim.Adam(net.parameters(), lr=1e-3, weight_decay=1e-5)
    loss_fn = nn.MSELoss()

    print("Training SehatLine deep neural network (PyTorch)...")
    t0 = time.time()
    epochs, bs = 40, 512
    ntr = Xtr.shape[0]
    for ep in range(epochs):
        net.train()
        perm = torch.randperm(ntr)
        tot = 0.0
        for i in range(0, ntr, bs):
            b = perm[i:i + bs]
            opt.zero_grad()
            out = net(Xtr[b])
            loss = loss_fn(out, ytr[b])
            loss.backward()
            opt.step()
            tot += loss.item() * len(b)
        if (ep + 1) % 8 == 0 or ep == 0:
            net.eval()
            with torch.no_grad():
                pred = net(Xte).numpy()
            print(f"  epoch {ep+1:2d}/{epochs} · train MSE={tot/ntr:6.2f} · test R2={r2(y[te], pred):.4f}")

    net.eval()
    with torch.no_grad():
        pred = np.clip(net(Xte).numpy(), 0, 100)
    mae = np.mean(np.abs(y[te] - pred))
    print(f"Done in {time.time()-t0:.1f}s · test R2={r2(y[te], pred):.4f} · MAE={mae:.2f}")

    torch.save(net.state_dict(), os.path.join(PKG, "weights.pt"))
    with open(os.path.join(PKG, "scaler.json"), "w") as f:
        json.dump({"mean": mean.tolist(), "std": std.tolist(), "features": FEATURES}, f)
    print(f"Saved weights.pt + scaler.json into {PKG}")


if __name__ == "__main__":
    main()
