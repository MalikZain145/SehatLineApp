"""The SehatLine deep neural network (PyTorch)."""

import torch
import torch.nn as nn


class SehatLineNet(nn.Module):
    """A feed-forward deep net: 14 → 64 → 32 → 16 → 1, ReLU + dropout.

    Regresses a 0-100 triage-urgency score from the 14 clinical features.
    """

    def __init__(self, in_dim=14):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 64), nn.ReLU(), nn.Dropout(0.10),
            nn.Linear(64, 32), nn.ReLU(), nn.Dropout(0.10),
            nn.Linear(32, 16), nn.ReLU(),
            nn.Linear(16, 1),
        )

    def forward(self, x):
        return self.net(x).squeeze(-1)
