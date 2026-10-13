import unittest
from autoparts_ai.thresholds import summarize_thresholds


class ThresholdStatisticsTest(unittest.TestCase):
    def test_recommendation_balances_accuracy_and_coverage(self):
        records = [{"confidence": .9, "correct": True}] * 50 + [{"confidence": .72, "correct": False}] * 2
        result = summarize_thresholds(records, [.7, .75, .9, .95])
        self.assertEqual(result["recommended_threshold"], .75)
        self.assertEqual(result["table"][0]["accepted_count"], 52)
        self.assertEqual(result["table"][0]["empirical_precision_among_accepted"], 50 / 52)
        self.assertIsNone(result["table"][-1]["empirical_precision_among_accepted"])
        self.assertLess(result["table"][1]["precision_wilson_95_interval"][0], 1)

    def test_insufficient_samples_never_recommend(self):
        result = summarize_thresholds([{"confidence": .99, "correct": True}] * 49, [.7, .9])
        self.assertIsNone(result["recommended_threshold"])

    def test_no_images_rejected(self):
        with self.assertRaises(ValueError):
            summarize_thresholds([], [.7])
