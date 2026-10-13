import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsDefined,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PartClassDto {
  @IsInt() @Min(0) id: number;
  @IsString() @MinLength(1) original_name: string;
  @IsString() @MinLength(1) training_label: string;
  @IsOptional() @IsString() spanish_name: string | null;
  @IsOptional() @IsString() translation_source: string | null;
  @IsObject() image_counts: Record<string, number>;
  @IsObject() metadata: Record<string, unknown>;
}

export class PartPredictionDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => PartClassDto)
  class_info: PartClassDto;
  @IsNumber() @Min(0) @Max(1) confidence: number;
}

export class PartModelInfoDto {
  @IsString() @MinLength(1) model: string;
  @IsObject() dataset: Record<string, unknown>;
  @IsInt() @Min(1) class_count: number;
  @IsOptional() @IsString() created_at: string | null;
  @IsString() @MinLength(1) weights_sha256: string;
  @IsOptional() @IsObject() metrics: Record<string, unknown> | null;
}

export class PartThresholdsDto {
  @IsNumber() @Min(0) @Max(1) conclusive: number;
  @IsNumber() @Min(0) @Max(1) high: number;
}

export class PartRecognitionResultDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => PartPredictionDto)
  prediction: PartPredictionDto;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PartPredictionDto)
  top_predictions: PartPredictionDto[];
  @IsIn(['high', 'medium', 'low']) confidence_state: 'high' | 'medium' | 'low';
  @IsBoolean() conclusive: boolean;
  @IsDefined()
  @ValidateNested()
  @Type(() => PartThresholdsDto)
  thresholds: PartThresholdsDto;
  @IsDefined()
  @ValidateNested()
  @Type(() => PartModelInfoDto)
  analysis: PartModelInfoDto;
}

export class PartHealthDto {
  @IsIn(['ok', 'model_unavailable']) status: 'ok' | 'model_unavailable';
  @IsBoolean() model_available: boolean;
}
