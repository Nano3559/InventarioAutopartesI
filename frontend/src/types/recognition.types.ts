export interface PartClass {
  id: number;
  original_name: string;
  training_label: string;
  spanish_name: string | null;
  translation_source: string | null;
  image_counts: Record<string, number>;
  metadata: { csv?: Array<{ source_file: string; matching_row_count: number; fields: Record<string, string[]> }> };
}

export interface PartPrediction { class_info: PartClass; confidence: number }

export interface RecognitionResult {
  prediction: PartPrediction;
  top_predictions: PartPrediction[];
  confidence_state: 'high' | 'medium' | 'low';
  conclusive: boolean;
  thresholds: Record<string, number>;
  analysis: {
    model: string;
    dataset: { slug?: string; url?: string; version?: string | number | null; license?: unknown };
    class_count: number;
    created_at?: string | null;
    weights_sha256: string;
    metrics?: Record<string, unknown> | null;
  };
}
