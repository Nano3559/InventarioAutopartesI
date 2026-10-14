export interface PartClass {
  id: number;
  original_name: string;
  training_label: string;
  spanish_name: string | null;
  translation_source: string | null;
  image_counts: Record<string, number>;
  metadata: Record<string, unknown>;
}

export interface PartPrediction {
  class_info: PartClass;
  confidence: number;
}

export interface RecognitionResult {
  prediction: PartPrediction;
  top_predictions: PartPrediction[];
  confidence_state: 'high' | 'medium' | 'low';
  conclusive: boolean;
  thresholds: {
    conclusive: number;
    high: number;
  };
  analysis: {
    model: string;
    dataset: Record<string, unknown>;
    class_count: number;
    created_at?: string | null;
    weights_sha256: string;
    metrics?: Record<string, unknown> | null;
  };
}

export interface RecognitionImage {
  uri: string;
  name: string;
  type: string;
  size?: number;
}
