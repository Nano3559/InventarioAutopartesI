import { BadRequestException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import * as ort from 'onnxruntime-node';
import {
  evaluateDemandGuardrails,
  evaluateFinancialHealth,
  inferTaxonomyFromPart,
  inferVehicleKnowledge,
} from './demand-guardrails';
import { DemandPredictionService } from './demand-prediction.service';

interface ServiceWithSession {
  session: Pick<ort.InferenceSession, 'run'> | null;
}

describe('DemandGuardrails & DemandPredictionService', () => {
  describe('inferTaxonomyFromPart', () => {
    it('clasifica Radiador en Refrigeración con desgaste correctivo', () => {
      const res = inferTaxonomyFromPart('Radiador de Aluminio');
      expect(res.matched).toBe(true);
      expect(res.categoria).toBe('Refrigeración');
      expect(res.defaultWear).toBe('correctivo');
    });

    it('clasifica Farol / Stop en Iluminación y Chapa/Manivela en Cerrajería', () => {
      expect(inferTaxonomyFromPart('Farol Delantero LED').categoria).toBe(
        'Iluminación',
      );
      expect(inferTaxonomyFromPart('Manivela de puerta').categoria).toBe(
        'Cerrajería',
      );
      expect(
        inferTaxonomyFromPart('Pastillas de freno cerámicas').categoria,
      ).toBe('Frenos');
    });
  });

  describe('inferVehicleKnowledge', () => {
    it('detecta Toyota Hilux como parque Alto sin conflicto', () => {
      const res = inferVehicleKnowledge('Toyota', 'Hilux');
      expect(res.brandConflict).toBe(false);
      expect(res.expectedParque).toBe('Alto');
    });

    it('detecta conflicto cuando se asigna Tucson a Toyota', () => {
      const res = inferVehicleKnowledge('Toyota', 'Tucson');
      expect(res.brandConflict).toBe(true);
      expect(res.expectedBrand).toBe('Hyundai');
    });
  });

  describe('evaluateFinancialHealth', () => {
    it('marca venta a pérdida cuando precio1 <= costo', () => {
      const fin = evaluateFinancialHealth(200, 150, 120);
      expect(fin.status).toBe('loss');
      expect(fin.bloqueadoFinanciero).toBe(true);
      expect(fin.utilidadUnitaria).toBe(-50);
      expect(fin.pvpMinimoRentable).toBe(230);
      expect(fin.pvpRecomendado).toBe(270);
      expect(fin.wholesaleLoss).toBe(true);
    });

    it('alerta margen insuficiente debajo del 15%', () => {
      const fin = evaluateFinancialHealth(200, 210);
      expect(fin.status).toBe('insufficient');
      expect(fin.bloqueadoFinanciero).toBe(false);
      expect(fin.saludMargen).toBeLessThan(30);
    });

    it('detecta incoherencia si precioMayor > precio1', () => {
      const fin = evaluateFinancialHealth(200, 300, 340);
      expect(fin.wholesaleConflict).toBe(true);
      expect(
        fin.issues.some(
          (i) =>
            i.code === 'WHOLESALE_ABOVE_RETAIL' && i.severity === 'blocker',
        ),
      ).toBe(true);
    });

    it('penaliza sobreprecio extremo (> 150%)', () => {
      const fin = evaluateFinancialHealth(10, 5000);
      expect(fin.status).toBe('overpriced');
      expect(fin.saludMargen).toBeLessThanOrEqual(30);
    });
  });

  describe('evaluateDemandGuardrails', () => {
    it('bloquea Radiador en Cerrajería con desgaste colision y Hilux como Nicho', () => {
      const evalRes = evaluateDemandGuardrails({
        producto: 'Radiador',
        marca: 'Toyota',
        modelo: 'Hilux',
        costo: 450,
        precio1: 650,
        categoriaRepuesto: 'Cerrajería',
        tipoDesgaste: 'colision',
        segmentoParque: 'Nicho',
      });

      expect(evalRes.hasSemanticBlockers).toBe(true);
      expect(evalRes.blockers.map((b) => b.code)).toEqual(
        expect.arrayContaining([
          'CATEGORY_MISMATCH',
          'WEAR_INCOMPATIBLE',
          'PARQUE_EXTREME_MISMATCH',
        ]),
      );
      expect(evalRes.suggestions).toEqual(
        expect.objectContaining({
          categoriaRepuesto: 'Refrigeración',
          tipoDesgaste: 'correctivo',
          segmentoParque: 'Alto',
        }),
      );
    });
  });

  describe('DemandPredictionService.predictSuccess', () => {
    let service: DemandPredictionService;
    let mockQuery: jest.Mock;
    let mockFindOne: jest.Mock;

    beforeEach(() => {
      mockQuery = jest.fn();
      mockFindOne = jest.fn();
      const mockDataSource = {
        query: mockQuery,
        getRepository: () => ({ findOne: mockFindOne }),
      } as unknown as DataSource;
      service = new DemandPredictionService(mockDataSource);
    });

    it('lanza BadRequestException si hay incoherencia semántica directa', async () => {
      await expect(
        service.predictSuccess({
          producto: 'Radiador',
          marca: 'Toyota',
          modelo: 'Hilux',
          costo: 300,
          precio1: 450,
          categoriaRepuesto: 'Cerrajería',
          tipoDesgaste: 'colision',
          segmentoParque: 'Alto',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devuelve Score 0% y Lote 0 ante precio de venta menor al costo (sin llamar ONNX para dar éxito)', async () => {
      mockQuery
        .mockResolvedValueOnce([
          {
            id: 22,
            producto: 'Radiador',
            marca: 'Toyota',
            modelo: 'Yaris',
            fabricante: 'Denso',
            categoriaRepuesto: 'Refrigeración',
            tipoDesgaste: 'correctivo',
            costo: 480,
            precio1: 680,
            total_vendido: 90,
          },
        ])
        .mockResolvedValueOnce([{ count: '1' }]);

      const res = await service.predictSuccess({
        producto: 'Radiador',
        marca: 'Toyota',
        modelo: 'Hilux',
        costo: 200,
        precio1: 150,
        precioMayor: 120,
        categoriaRepuesto: 'Refrigeración',
        tipoDesgaste: 'correctivo',
        segmentoParque: 'Alto',
      });

      expect(res.scoreExito).toBe(0);
      expect(res.loteSugeridoCompra).toBe(0);
      expect(res.bloqueadoFinanciero).toBe(true);
      expect(res.recomendacionCompra.accion).toBe('NO_IMPORTAR');
      expect(res.recomendacionCompra.pvpMinimoRentable).toBe(230);
      expect(res.alertas.nivelAlerta).toBe('critica');
    });

    it('topa la viabilidad cuando el margen es insuficiente (< 15%) incluso si ONNX dice clase 2', async () => {
      (service as unknown as ServiceWithSession).session = {
        run: jest.fn().mockResolvedValue({
          output_label: { data: [2] },
          output_probability: { data: [0.05, 0.15, 0.8] },
        }),
      };

      mockQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '1' }]);

      const res = await service.predictSuccess({
        producto: 'Farol',
        marca: 'Toyota',
        modelo: 'Hilux',
        costo: 200,
        precio1: 210,
        categoriaRepuesto: 'Iluminación',
        tipoDesgaste: 'desgaste_medio',
        segmentoParque: 'Alto',
      });

      expect(res.scoreExito).toBeLessThanOrEqual(38);
      expect(res.loteSugeridoCompra).toBeLessThanOrEqual(4);
      expect(res.recomendacionCompra.accion).toBe('AJUSTAR_PRECIO');
      expect(res.alertas.nivelAlerta).toBe('critica');
    });

    it('calcula Score alto, GMROI y lote dinámico cuando todo es coherente y rentable', async () => {
      (service as unknown as ServiceWithSession).session = {
        run: jest.fn().mockResolvedValue({
          output_label: { data: [2] },
          output_probability: { data: [0.05, 0.12, 0.83] },
        }),
      };

      mockQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '1' }]);

      const res = await service.predictSuccess({
        producto: 'Farol',
        marca: 'Toyota',
        modelo: 'Hilux',
        costo: 350,
        precio1: 490,
        precioMayor: 420,
        categoriaRepuesto: 'Iluminación',
        tipoDesgaste: 'desgaste_medio',
        segmentoParque: 'Alto',
      });

      expect(res.scoreExito).toBeGreaterThanOrEqual(75);
      expect(res.recomendacionCompra.accion).toBe('COMPRAR_LOTE');
      expect(res.loteSugeridoCompra).toBeGreaterThan(5);
      expect(res.metricasProyectadas.utilidadUnitaria).toBe(140);
      expect(res.metricasProyectadas.gmroiProyectado).toBeGreaterThan(1);
    });

    it('devuelve contrato completo en getDemandSummary para ProductDemandCard', async () => {
      mockFindOne.mockResolvedValue({
        id: 1,
        producto: 'Farol',
        marca: 'Toyota',
        modelo: 'Hilux',
        stockMinimo: 5,
        categoriaRepuesto: 'Iluminación',
        tipoDesgaste: 'desgaste_medio',
        segmentoParque: 'Alto',
      });
      mockQuery
        .mockResolvedValueOnce([{ stock: '4' }])
        .mockResolvedValueOnce([
          { sold_30: '18', sold_90: '45', sold_total: '120' },
        ])
        .mockResolvedValueOnce([{ dev_30: '1', dev_total: '3' }]);

      const summary = await service.getDemandSummary(1);
      expect(summary.productoId).toBe(1);
      expect(summary.stockTotal).toBe(4);
      expect(summary.ventasUltimos30Dias).toBe(18);
      expect(summary.ventasPromedioMensual).toBe(15);
      expect(summary.nivelRiesgo).toBe('critico');
      expect(summary.rotacionClasificacion).toBe('Alta Rotación');
      expect(summary.tasaDevolucionPorcentaje).toBe(2.5);
    });
  });
});
