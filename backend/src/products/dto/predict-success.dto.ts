import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
  costo: number;

  @IsNotEmpty()
  @IsNumber()
  precio1: number;

  @IsOptional()
  @IsNumber()
  precioMayor?: number;

  @IsOptional()
  @IsString()
  categoriaRepuesto?: string;

  @IsOptional()
  @IsString()
  tipoDesgaste?: string;

  @IsOptional()
  @IsString()
  segmentoParque?: string;

  @IsOptional()
  @IsNumber()
  locationId?: number;
}

