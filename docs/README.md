# Documentación técnica — AutoParts Pro

Centro de documentación del sistema de inventario y ventas para las 7 importadoras
de autopartes. Todo lo que un desarrollador (o el asistente de código) necesita para
entender, correr, mantener y desplegar el proyecto.

## Índice

| Documento | Contenido | Cuándo consultarlo |
| :--- | :--- | :--- |
| [Git Convention](git-convention.md) | Ramas, mensajes de commit (Conventional Commits), flujo de PR y definición de "terminado" | Antes de crear una rama, commitear o mergear |
| [Stack Tecnológico](stack-tecnologico.md) | Versiones exactas, dependencias clave y justificación de cada tecnología | Antes de agregar una dependencia nueva |
| [Arquitectura](arquitectura.md) | Diagramas, entidades, módulos NestJS, RBAC y flujos críticos | Al tocar backend o referirse a modelos de datos |
| [Variables de Entorno](entornos.md) | `.env` por subproyecto: variables, defaults y cómo cargarlas | Al configurar un entorno local o de producción |
| [Despliegue](despliegue.md) | Publicación en Vercel, Render y EAS para la app móvil | En tareas de release/deploy |
| [API Reference](api.md) | Endpoints REST del backend con prefijo, método y ruta | Al consumir la API desde web o móvil |

## Documentos de negocio (raíz)

- [requerimientos.md](../requerimientos.md) — ejercicio completo del cliente: roles, módulos, flujos y criterio principal.
- [PLAN.md](../PLAN.md) — plan día a día del equipo, códigos de tarea (B/M/R) y ruta crítica.

## Reglas de mantenimiento

1. **Un solo dueño por tema**: el README describe el "qué"; `docs/` describe el "cómo".
2. Al cambiar una ruta/endpoint, actualizar `api.md` en el mismo commit.
3. Al agregar una dependencia, actualizar `stack-tecnologico.md`.
4. Las convenciones de Git cambian solo por consenso del equipo y se reflejan en `git-convention.md`.