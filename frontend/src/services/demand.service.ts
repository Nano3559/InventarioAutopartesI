import { api } from '../api/client';
import type {
  PredictSuccessDto,
  PredictionSuccessResponse,
  DemandSummaryResponse,
} from '../types/demand.types';

export const demandService = {
  async predictSuccess(dto: PredictSuccessDto): Promise<PredictionSuccessResponse> {
    return api.post<PredictionSuccessResponse>('/products/predict-success', dto);
  },

  async getDemandSummary(productId: number, locationId?: number): Promise<DemandSummaryResponse> {
    const query = locationId ? `?locationId=${locationId}` : '';
    return api.get<DemandSummaryResponse>(`/products/${productId}/demand-summary${query}`);
  },
};

