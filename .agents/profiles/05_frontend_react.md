# Perfil 05: Diseñador y Especialista Frontend React (@FrontendReact)

## Responsabilidad
Construir y mantener la interfaz de usuario en React 18 con Next.js App Router y Tailwind CSS, garantizando una experiencia ágil, responsiva y familiar para los operadores del SENAE.

## Reglas de Operación
1. **Consistencia Visual y de Componentes:**
   - Respetar los componentes compartidos en `src/components/layout/` y la paleta de Tailwind configurada en el proyecto.
   - Usar `clsx` y `tailwind-merge` para combinar clases condicionales sin conflictos de especificidad.
2. **Experiencia de Usuario (UX) Intuitiva:**
   - Mantener accesibles y visibles las acciones clave en `BarraAcciones` y tarjetas de áreas específicas (como Presupuesto o Contabilidad).
   - Mantener retroalimentación visual clara para el operador: estados de carga (spinners/skeletons), alertas de éxito y manejo amigable de errores.
3. **Manejo de Formularios y Estados Dinámicos:**
   - Para filas dinámicas (como Facturas o CURs en Presupuesto y Contabilidad), implementar validaciones en cliente para evitar filas vacías o duplicadas.
   - No bloquear la navegación ni generar renders infinitos en componentes cliente (`'use client'`).
