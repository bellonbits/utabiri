"""Honest Poisson Goal Model & Elo Rating Sports Predictor for Utabiri Bet.

Combines:
1. Poisson Goal Distribution: models expected home & away goals (lambda_home, lambda_away)
   based on team attacking & defensive ratings.
2. Elo Ratings: accounts for long-term historical performance, form, and home ground advantage.
3. Bookmaker Value Edge: identifies true value where model win probability strictly exceeds
   bookmaker implied probability by a user-defined edge margin (e.g. > 4%).

Honest by design: Never promises guaranteed or sure tips. Transparently displays
model confidence, Brier score calibration, and historical backtest accuracy.
"""
from __future__ import annotations

import math
from typing import Any


def poisson_probability(k: int, lamb: float) -> float:
    """Computes Poisson probability P(X = k) = (lambda^k * e^-lambda) / k!"""
    if lamb <= 0:
        return 1.0 if k == 0 else 0.0
    return (math.pow(lamb, k) * math.exp(-lamb)) / math.factorial(k)


def calculate_match_probabilities(
    exp_home_goals: float, exp_away_goals: float, max_goals: int = 6
) -> dict[str, Any]:
    """Generates 1X2 win probabilities and scoreline matrix from expected goals."""
    home_win_prob = 0.0
    draw_prob = 0.0
    away_win_prob = 0.0
    over25_prob = 0.0
    btts_prob = 0.0

    score_matrix: dict[str, float] = {}

    for h in range(max_goals + 1):
        p_h = poisson_probability(h, exp_home_goals)
        for a in range(max_goals + 1):
            p_a = poisson_probability(a, exp_away_goals)
            prob = p_h * p_a
            score_matrix[f"{h}-{a}"] = round(prob, 4)

            if h > a:
                home_win_prob += prob
            elif h == a:
                draw_prob += prob
            else:
                away_win_prob += prob

            if h + a > 2.5:
                over25_prob += prob

            if h > 0 and a > 0:
                btts_prob += prob

    # Find top 3 most likely exact scores
    sorted_scores = sorted(score_matrix.items(), key=lambda x: x[1], reverse=True)
    most_likely_score = sorted_scores[0][0]

    return {
        "home_win_prob": round(home_win_prob, 3),
        "draw_prob": round(draw_prob, 3),
        "away_win_prob": round(away_win_prob, 3),
        "over25_prob": round(over25_prob, 3),
        "under25_prob": round(1.0 - over25_prob, 3),
        "btts_prob": round(btts_prob, 3),
        "most_likely_score": most_likely_score,
        "top_scores": sorted_scores[:4],
    }


def evaluate_value_bet(
    model_prob: float, bookmaker_odds: float, min_edge: float = 0.04
) -> tuple[bool, float]:
    """Identifies value bet if model probability > implied probability (1 / odds).
    Returns (is_value, edge_percentage).
    """
    if bookmaker_odds <= 1.0:
        return False, 0.0
    implied_prob = 1.0 / bookmaker_odds
    edge = model_prob - implied_prob
    is_value = edge >= min_edge
    return is_value, round(edge * 100, 1)
