"""Empirical selective accuracy on validation; not probability calibration."""
import math


def summarize_thresholds(records, thresholds, minimum_threshold=0.70, target_precision=0.97, minimum_accepted=50):
    if not records:
        raise ValueError("No hay predicciones de validación")
    table = []
    for threshold in thresholds:
        accepted = [row for row in records if row["confidence"] >= threshold]
        count = len(accepted)
        correct = sum(row["correct"] for row in accepted)
        precision = correct / count if count else None
        interval = None
        if count:
            z = 1.959963984540054
            denominator = 1 + z * z / count
            center = (precision + z * z / (2 * count)) / denominator
            margin = z * math.sqrt(precision * (1 - precision) / count + z * z / (4 * count * count)) / denominator
            interval = [max(0, center - margin), min(1, center + margin)]
        table.append({"threshold": threshold, "accepted_count": count, "correct_count": correct, "error_count": count - correct, "coverage": count / len(records), "empirical_precision_among_accepted": precision, "precision_wilson_95_interval": interval})
    eligible = [row for row in table if row["threshold"] >= minimum_threshold and row["accepted_count"] >= minimum_accepted and row["empirical_precision_among_accepted"] >= target_precision]
    recommended = min((row["threshold"] for row in eligible), default=None)
    return {"table": table, "recommended_threshold": recommended}
