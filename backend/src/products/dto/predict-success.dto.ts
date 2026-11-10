import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CATEGORIAS_REPUESTO,
  SEGMENTOS_PARQUE,
  TIPOS_DESGASTE,
} from '../product-guardrails';

const AL_MENOS_UNA_LETRA = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/;
const AL_MENOS_UN_ALFANUMERICO = /[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]/;

export class PredictSuccessDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(AL_MENOS_UNA_LETRA, {
    message: 'El nombre del repuesto debe contener al menos una letra',
  })
  producto: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(AL_MENOS_UN_ALFANUMERICO, {
    message: 'La marca debe contener caracteres válidos',
  })
  marca: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(AL_MENOS_UN_ALFANUMERICO, {
    message: 'El modelo debe contener caracteres válidos',
  })
  modelo: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}(-\d{4})?$/, {
    message: 'El año debe ser un año (Ej. 2016) o un rango (Ej. 2016-2020)',
  })
  anio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  fabricante?: string;

  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El costo debe ser un número válido' },
  )
  @IsPositive({ message: 'El costo debe ser mayor a 0' })
  costo: number;

  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El precio de mostrador debe ser un número válido' },
  )
  @IsPositive({ message: 'El precio de mostrador debe ser mayor a 0' })
  precio1: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El precio mayorista debe ser un número válido' },
  )
  @IsPositive({ message: 'El precio mayorista debe ser mayor a 0' })
  precioMayor?: number;

  @IsOptional()
  @IsIn(CATEGORIAS_REPUESTO, {
    message: 'La categoría del repuesto no es válida',
  })
  categoriaRepuesto?: string;

  @IsOptional()
  @IsIn(TIPOS_DESGASTE, {
    message: 'El tipo de desgaste no es válido',
  })
  tipoDesgaste?: string;

  @IsOptional()
  @IsIn(SEGMENTOS_PARQUE, {
    message: 'El segmento de parque no es válido',
  })
  segmentoParque?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'La ubicación debe ser un número válido' },
  )
  @IsPositive({ message: 'La ubicación debe ser mayor a 0' })
  locationId?: number;
}
