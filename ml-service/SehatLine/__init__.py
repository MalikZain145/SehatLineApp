"""
SehatLine — patient-triage deep-learning package.

Usage:
    from SehatLine import SehatLine
    model = SehatLine()
    model.prioritize([{ "age": 78, "conditions": ["heart disease"], ... }])
    model.score({ "age": 40, ... })

A real PyTorch neural network trained specifically for SehatLine's job:
deciding which patient should be seen first (elderly + critical recent vitals
rank higher). Falls back to the built-in clinical rules if the trained weights
aren't present, so importing it never fails.
"""

from .sehatline import SehatLine

__all__ = ["SehatLine"]
__version__ = "1.0.0"
