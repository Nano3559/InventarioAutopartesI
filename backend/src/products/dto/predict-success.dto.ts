import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PredictSuccessDto {
  @IsNotEmpty()
  @IsString()
  producto: string;

  @IsNotEmpty()
  @IsString()
  marca: string;

  @IsNotEmpty()
  @IsString()
  modelo: string;

  @IsOptional()
  @IsString()
  anio?: string;

  @IsOptional()
  @IsString()
  fabricante?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  costo: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  precio1: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioMayor?: number;

  @IsOptional()
  @IsString()
  categoriaRepuesto?: string;

  @IsOptional()
  @IsString()
  @IsIn(['colision', 'desgaste_medio', 'desgaste_frecuente', 'correctivo'])
  tipoDesgaste?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Alto', 'Medio', 'Nicho'])
  segmentoParque?: string;

  @IsOptional()
  @IsNumber()
  locationId?: number;
}
