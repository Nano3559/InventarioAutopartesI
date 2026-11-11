"""Reproduce el Random Forest del notebook y exporta su contrato para NestJS."""

import argparse
import hashlib
import importlib.metadata
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as rt
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType, StringTensorType


NUMERIC = ['costo', 'precio1', 'margen_relativo', 'ratio_precio_mayor']
CATEGORICAL = ['categoria_repuesto', 'tipo_desgaste', 'segmento_parque']
ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, default=ROOT / 'dataset_entrenamiento.csv')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'backend' / 'models')
    args = parser.parse_args()
    df = pd.read_csv(args.dataset, encoding='utf-8-sig')
    required = NUMERIC + CATEGORICAL + ['clase_exito']
    if not set(required).issubset(df.columns) or df[required].isna().any().any():
        raise ValueError('El dataset no contiene todas las variables requeridas o tiene datos vacíos.')
    if not np.isfinite(df[NUMERIC].to_numpy(dtype=float)).all():
        raise ValueError('Hay valores numéricos no finitos en el dataset.')
    if (df[['costo', 'precio1']] <= 0).any().any():
        raise ValueError('Los costos y precios del dataset deben ser positivos.')
    if set(df['clase_exito'].unique()) != {0, 1, 2}:
        raise ValueError('El dataset debe contener las tres clases de rotación.')

    x = df[NUMERIC + CATEGORICAL].copy()
    x[NUMERIC] = x[NUMERIC].astype(np.float32)
    y = df['clase_exito']
    pipeline = Pipeline([
        ('preprocessor', ColumnTransformer([
            # Los árboles no necesitan escalar. Conservar float32 evita diferencias
            # en los umbrales por el redondeo del Scaler ONNX frente a scikit-learn.
            ('num', 'passthrough', NUMERIC),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False, dtype=np.float32), CATEGORICAL),
        ])),
        ('classifier', RandomForestClassifier(
            n_estimators=100, max_depth=5, class_weight='balanced', random_state=42,
        )),
    ])
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.20, random_state=42, stratify=y,
    )
    pipeline.fit(x_train, y_train)
    predictions = pipeline.predict(x_test)
    evaluation = {
        'train_rows': len(x_train), 'test_rows': len(x_test),
        'accuracy': accuracy_score(y_test, predictions),
        'confusion_matrix': confusion_matrix(y_test, predictions, labels=[0, 1, 2]).tolist(),
        'classification_report': classification_report(
            y_test, predictions, labels=[0, 1, 2], output_dict=True, zero_division=0,
        ),
        'limitation': 'Muestra pequeña; evaluación exploratoria, no garantía de precisión futura.',
    }
    # Igual que el notebook: la exportación final se ajusta con todos los registros.
    # Las métricas anteriores corresponden exclusivamente al holdout previo a este ajuste.
    pipeline.fit(x, y)
    initial_types = [(name, FloatTensorType([None, 1])) for name in NUMERIC]
    initial_types += [(name, StringTensorType([None, 1])) for name in CATEGORICAL]
    model = convert_sklearn(
        pipeline, initial_types=initial_types, target_opset=12,
        options={
            id(pipeline.named_steps['classifier']): {'zipmap': False},
        },
    )
    onnx.checker.check_model(model)
    session = rt.InferenceSession(model.SerializeToString(), providers=['CPUExecutionProvider'])
    feeds = {name: x[[name]].to_numpy(dtype=np.float32) for name in NUMERIC}
    feeds.update({name: x[[name]].to_numpy(dtype=str) for name in CATEGORICAL})
    outputs = session.run(None, feeds)
    names = [item.name for item in session.get_outputs()]
    if names != ['label', 'probabilities'] and names != ['output_label', 'probabilities']:
        raise ValueError(f'Contrato ONNX inesperado: {names}')
    # NestJS ya consume output_label; preservar ese nombre para ambas versiones del exportador.
    if names[0] == 'label':
        for node in model.graph.node:
            for index, value in enumerate(node.output):
                if value == 'label':
                    node.output[index] = 'output_label'
            for index, value in enumerate(node.input):
                if value == 'label':
                    node.input[index] = 'output_label'
        model.graph.output[0].name = 'output_label'
    onnx.checker.check_model(model)
    if not np.array_equal(outputs[0], pipeline.predict(x)):
        raise ValueError('La clasificación ONNX no coincide con scikit-learn.')
    difference = float(np.max(np.abs(outputs[1] - pipeline.predict_proba(x))))
    if difference > 1e-5:
        raise ValueError(f'La probabilidad ONNX difiere de scikit-learn: {difference}')

    args.output_dir.mkdir(parents=True, exist_ok=True)
    model_path = args.output_dir / 'modelo_exito_autopartes.onnx'
    onnx.save_model(model, str(model_path))
    metadata = {
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'algorithm': 'RandomForestClassifier',
        'numeric_preprocessing': 'float32 passthrough (trees do not require scaling)',
        'parameters': pipeline.named_steps['classifier'].get_params(),
        'training_rows': len(df),
        'dataset_sha256': hashlib.sha256(args.dataset.read_bytes()).hexdigest(),
        'class_order': [int(value) for value in pipeline.classes_],
        'categorias_validas': sorted(df['categoria_repuesto'].unique().tolist()),
        'tipos_desgaste': sorted(df['tipo_desgaste'].unique().tolist()),
        'segmentos_parque': sorted(df['segmento_parque'].unique().tolist()),
        'evaluation': evaluation,
        'onnx_max_probability_difference': difference,
        'versions': {name: importlib.metadata.version(name) for name in [
            'numpy', 'pandas', 'scikit-learn', 'skl2onnx', 'onnx', 'onnxruntime',
        ]},
    }
    model_path.with_suffix('.json').write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8',
    )
    print(json.dumps({
        'model': str(model_path), 'rows': len(df), 'evaluation': evaluation,
        'max_probability_difference': difference,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
