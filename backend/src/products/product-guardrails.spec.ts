import {
  calcularScorePonderado,
  inferirCategoria,
  inferirTipoDesgaste,
  validarFinanzas,
  validarSemantica,
} from './product-guardrails';

describe('product-guardrails', () => {
  describe('inferencia semántica', () => {
    it('infiere Refrigeración para un radiador', () => {
      expect(inferirCategoria('Radiador de agua')?.categoria).toBe(
        'Refrigeración',
      );
    });

    it('infiere Iluminación para un farol', () => {
      expect(inferirCategoria('Farol delantero LED')?.categoria).toBe(
        'Iluminación',
      );
    });

    it('detecta categoría incoherente y protege la entrada del modelo', () => {
      const resultado = validarSemantica({
        producto: 'Radiador',
        categoriaRepuesto: 'Cerrajería',
        tipoDesgaste: 'colision',
        modelo: 'Hilux',
        segmentoParque: 'Alto',
      });

      expect(resultado.categoriaUsada).toBe('Refrigeración');
      expect(resultado.coherente).toBe(false);
      expect(resultado.advertencias.join(' ')).toContain(
        'Categoría incoherente',
      );
      expect(resultado.tipoDesgasteUsado).toBe('correctivo');
      expect(resultado.advertencias.join(' ')).toContain(
        'Tipo de desgaste incoherente',
      );
    });

    it('acepta una combinación coherente', () => {
      const resultado = validarSemantica({
        producto: 'Farol delantero LED',
        categoriaRepuesto: 'Iluminación',
        tipoDesgaste: 'colision',
        segmentoParque: 'Alto',
      });

      expect(resultado.coherente).toBe(true);
      expect(resultado.advertencias).toHaveLength(0);
      expect(resultado.categoriaUsada).toBe('Iluminación');
    });

    it('normaliza categorías sin tildes', () => {
      const resultado = validarSemantica({
        producto: 'Cerradura de puerta',
        categoriaRepuesto: 'Cerrajeria',
      });

      expect(resultado.categoriaUsada).toBe('Cerrajería');
      expect(resultado.coherente).toBe(true);
      expect(inferirTipoDesgaste('Cerrajería')).toBe('desgaste_frecuente');
    });

    it('usa la categoría declarada cuando el nombre no da pistas', () => {
      const resultado = validarSemantica({
        producto: 'Kit especial',
        categoriaRepuesto: 'Motor',
      });

      expect(resultado.categoriaInferida).toBeNull();
      expect(resultado.categoriaUsada).toBe('Motor');
    });
  });

  describe('guardrail financiero', () => {
    it('bloquea la venta cuando el precio es menor al costo', () => {
      const resultado = validarFinanzas({ costo: 200, precio1: 150 });

      expect(resultado.bloqueado).toBe(true);
      expect(resultado.margenRelativo).toBe(-0.25);
      expect(resultado.errores.join(' ')).toContain('INVIABLE');
      expect(resultado.errores.join(' ')).toContain('50.00');
    });

    it('bloquea la venta cuando el precio es igual al costo', () => {
      const resultado = validarFinanzas({ costo: 200, precio1: 200 });

      expect(resultado.bloqueado).toBe(true);
      expect(resultado.margenPorcentaje).toBe(0);
    });

    it('alerta margen insuficiente pero no bloquea', () => {
      const resultado = validarFinanzas({ costo: 200, precio1: 220 });

      expect(resultado.bloqueado).toBe(false);
      expect(resultado.margenPorcentaje).toBe(10);
      expect(resultado.advertencias.join(' ')).toContain('Margen insuficiente');
      expect(resultado.pvpMinimoSugerido).toBe(230);
      expect(resultado.pvpRecomendado).toBe(270);
    });

    it('bloquea mayorista por debajo del costo', () => {
      const resultado = validarFinanzas({
        costo: 200,
        precio1: 300,
        precioMayor: 180,
      });

      expect(resultado.bloqueado).toBe(true);
      expect(resultado.errores.join(' ')).toContain(
        'precio mayorista (Bs. 180.00) es menor o igual al costo',
      );
    });

    it('bloquea mayorista mayor al precio de mostrador', () => {
      const resultado = validarFinanzas({
        costo: 200,
        precio1: 300,
        precioMayor: 350,
      });

      expect(resultado.bloqueado).toBe(true);
      expect(resultado.errores.join(' ')).toContain(
        'no puede superar al precio de mostrador',
      );
    });

    it('rechaza costos y precios no positivos', () => {
      const resultado = validarFinanzas({ costo: 0, precio1: -1 });

      expect(resultado.bloqueado).toBe(true);
      expect(resultado.errores).toHaveLength(2);
    });
  });

  describe('score ponderado', () => {
    it('desploma el score cuando el margen es nulo', () => {
      const resultado = calcularScorePonderado({
        scoreRotacion: 88.5,
        saludMargen: 0,
        saturacionCatalogo: 0,
      });

      expect(resultado.score).toBe(55.4);
      expect(resultado.score).toBeLessThan(88.5);
    });

    it('premia un margen sano', () => {
      const resultado = calcularScorePonderado({
        scoreRotacion: 88.5,
        saludMargen: 100,
        saturacionCatalogo: 0,
      });

      expect(resultado.score).toBe(95.4);
    });

    it('castiga un catálogo saturado', () => {
      const resultado = calcularScorePonderado({
        scoreRotacion: 88.5,
        saludMargen: 100,
        saturacionCatalogo: 5,
      });

      expect(resultado.scoreSaturacion).toBe(0);
      expect(resultado.score).toBe(75.4);
    });
  });
});
