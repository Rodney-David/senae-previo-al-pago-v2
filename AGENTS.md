# Reglas de Proyecto y Sistema de Agentes - SENAE Control Previo v2

Este documento es la constitución operativa para el asistente de IA y el equipo de desarrollo. Define las reglas inmutables del negocio y el sistema de agentes especializados.

---

## 1. Reglas Inmutables del Negocio SENAE

- **Estado de Contabilidad**: El estado en base de datos e interfaz para los trámites en el área contable es **`CONTABILIDAD`**. Nunca usar `CONTROL_PREVIO` como estado.
- **Fidelidad al Flujo Original**: Apegarse estrictamente a la terminología y flujo de la bitácora histórica del SENAE (`PAGADO`, `CONTABILIDAD`, `ARCHIVO`, `DEVUELTO`, `REVISION`, `OBSERVADO`, `DFI`).
- **Consulta y Aprobación Previa**: Apegarse al flujo y terminología original, pero se pueden incorporar mejoras, nuevos estados o cambios de nombres siempre que se conversen previamente y cuenten con la aprobación explícita del usuario.
- **Presupuesto - Registro Dinámico**: `CUR Compromiso` y `Factura` se agregan por filas individuales con botón `[+ Agregar]` y papelera para eliminar, idéntico a Contabilidad.
- **Detalle Extendido de Reglas**: Consultar [.agents/rules/senae_reglas_negocio.md](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/.agents/rules/senae_reglas_negocio.md).

---

## 2. Metodología Operativa con IA (Flujo en 4 Fases)

Todo trabajo sobre este repositorio sigue obligatoriamente este ciclo:

```
[ Requerimiento de Rodney ]
          │
          ▼
1. FASE DE PLANIFICACIÓN (@Planner)
   - Diagnóstico del código actual.
   - Definición de archivos a tocar.
   - Estrategia para no tocar código funcional.
          │
          ▼
2. REVISIÓN Y APROBACIÓN HUMANA
   - Rodney revisa y valida el plan.
   - Ajustes si algo no convence.
          │
          ▼
3. EJECUCIÓN QUIRÚRGICA
   - Modificación únicamente de las líneas indispensables.
   - Auditoría de seguridad y coherencia Prisma.
          │
          ▼
4. VERIFICACIÓN DE BUILD (@BuildVerifier)
   - Ejecución de `npm run build`.
   - Veredicto final: "✅ Check: Build limpio".
```

---

## 3. Directorio de Perfiles de Agentes Especializados

Cada tarea puede invocar a uno o varios agentes según el ámbito del cambio:

1. [**@Planner (Orquestador y Planificador)**](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/.agents/profiles/01_orquestador_planner.md): Diseña el plan de trabajo detallado antes de escribir código.
2. [**@GuardianFuncional (Protector de Producción)**](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/.agents/profiles/02_guardian_funcional.md): Vigila que no se rompa ni borre lógica funcional previa.
3. [**@Ciberseguridad (Rutas API & Auth)**](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/.agents/profiles/03_ciberseguridad_rutas.md): Audita endpoints `/api/...`, `middleware.ts`, variables de entorno y sesiones.
4. [**@DatabasePrisma (Integridad de Datos)**](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/.agents/profiles/04_base_datos_prisma.md): Revisa `prisma/schema.prisma`, queries, llaves primarias/foráneas y transacciones.
5. [**@FrontendReact (UI & Experiencia de Usuario)**](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/.agents/profiles/05_frontend_react.md): Maneja componentes React, Tailwind CSS y vistas de operador.
6. [**@BuildVerifier (Compilación & QA)**](file:///c:/Users/PC/Documents/RODNEY%20SENAE/senae_control_previo_v2_rocky9/.agents/profiles/06_build_integrity_verifier.md): Ejecuta `npm run build` en la terminal y emite el "Check".

---

## 4. Instrucción Rápida de Invocación para Prompts

Para activar este flujo en cualquier sesión de chat, inicia con:

> *"Revisa `AGENTS.md`. Necesito hacer [X cambio]. Actúa como @Planner y dame el plan paso a paso antes de tocar código. Toma en cuenta a @GuardianFuncional para no alterar lo que ya está en producción."*
