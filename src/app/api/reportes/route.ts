import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Función auxiliar para calcular días hábiles entre dos fechas descontando fines de semana y feriados
function calcularDiasHabilesRango(
  fechaInicio: Date,
  fechaFin: Date,
  feriadosSet: Set<string>
): number {
  if (fechaFin < fechaInicio) return 0;

  let count = 0;
  const cur = new Date(fechaInicio);
  cur.setHours(0, 0, 0, 0);

  const end = new Date(fechaFin);
  end.setHours(23, 59, 59, 999);

  while (cur <= end) {
    const day = cur.getDay();
    const str = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
      cur.getDate()
    ).padStart(2, "0")}`;

    if (day !== 0 && day !== 6 && !feriadosSet.has(str)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return Math.max(0, count);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaDesdeParam = searchParams.get("fecha_desde");
    const fechaHastaParam = searchParams.get("fecha_hasta");

    // Rango de fechas por defecto: últimos 60 días
    const now = new Date();
    const defaultDesde = new Date(now);
    defaultDesde.setDate(defaultDesde.getDate() - 60);

    const fechaDesde = fechaDesdeParam ? new Date(fechaDesdeParam) : defaultDesde;
    fechaDesde.setHours(0, 0, 0, 0);

    const fechaHasta = fechaHastaParam ? new Date(fechaHastaParam) : now;
    fechaHasta.setHours(23, 59, 59, 999);

    // Obtener feriados
    const feriados = await prisma.feriados.findMany({
      where: { activo: true },
      select: { fecha: true },
    });
    const feriadosSet = new Set(
      feriados.map((f) => {
        const d = new Date(f.fecha);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
      })
    );

    // Consultar trámites ingresados en el rango con todas sus relaciones
    const tramites = await prisma.tramites.findMany({
      where: {
        fecha_ingreso: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      include: {
        tipos_tramite: true,
        usuarios: {
          include: {
            areas: true,
          },
        },
        areas: true,
        historial_movimientos: {
          orderBy: { fecha_hora: "asc" },
        },
        observaciones: true,
      },
      orderBy: { fecha_ingreso: "desc" },
    });

    // -------------------------------------------------------------
    // REPORTE 1: INGRESOS Y CUSTODIA ACTUAL
    // -------------------------------------------------------------
    let totalIngresados = tramites.length;
    let totalPagados = 0;
    let totalEnProceso = 0;
    let totalObservadosPausados = 0;

    const mapaCustodios: Record<
      number,
      {
        id_usuario: number;
        nombre_completo: string;
        cargo: string;
        area_nombre: string;
        total_tramites: number;
        en_plazo: number;
        en_riesgo: number;
        vencidos: number;
      }
    > = {};

    const mapaAreas: Record<
      number,
      {
        id_area: number;
        nombre: string;
        codigo: string;
        total: number;
      }
    > = {};

    const mapaEstados: Record<string, number> = {};

    const tramitesDetalle = tramites.map((t) => {
      // Estado
      const estado = t.estado_general;
      mapaEstados[estado] = (mapaEstados[estado] || 0) + 1;

      if (estado === "PAGADO") {
        totalPagados++;
      } else if (
        estado === "OBSERVADO" ||
        t.sub_estado === "OBSERVADO_72H" ||
        t.esta_pausado
      ) {
        totalObservadosPausados++;
        totalEnProceso++;
      } else if (estado !== "ARCHIVADO" && estado !== "ANULADO") {
        totalEnProceso++;
      }

      // Cálculo de días hábiles consumidos
      const fInicio = t.fecha_recepcion_fisica || t.fecha_ingreso || now;
      const fFin = estado === "PAGADO" && t.fecha_pago ? t.fecha_pago : now;

      let diasHabilesNetos = calcularDiasHabilesRango(
        new Date(fInicio),
        new Date(fFin),
        feriadosSet
      );

      // Descontar días de pausa acumulados (factura SRI)
      const diasPausa = t.dias_pausa_acumulados || 0;
      const diasEfectivos = Math.max(0, diasHabilesNetos - diasPausa);

      // Semáforo SLA (norma 6 días hábiles)
      let alerta = "VERDE";
      if (diasEfectivos > 6) {
        alerta = "ROJO"; // Vencido
      } else if (diasEfectivos >= 5) {
        alerta = "AMBAR"; // Riesgo
      }

      // Agrupar por Custodio
      if (t.usuarios) {
        const cId = t.usuarios.id_usuario;
        if (!mapaCustodios[cId]) {
          mapaCustodios[cId] = {
            id_usuario: cId,
            nombre_completo: t.usuarios.nombre_completo,
            cargo: t.usuarios.cargo,
            area_nombre: t.usuarios.areas?.nombre || "Sin Área",
            total_tramites: 0,
            en_plazo: 0,
            en_riesgo: 0,
            vencidos: 0,
          };
        }
        mapaCustodios[cId].total_tramites++;
        if (alerta === "ROJO") mapaCustodios[cId].vencidos++;
        else if (alerta === "AMBAR") mapaCustodios[cId].en_riesgo++;
        else mapaCustodios[cId].en_plazo++;
      }

      // Agrupar por Área
      if (t.areas) {
        const aId = t.areas.id_area;
        if (!mapaAreas[aId]) {
          mapaAreas[aId] = {
            id_area: aId,
            nombre: t.areas.nombre,
            codigo: t.areas.codigo,
            total: 0,
          };
        }
        mapaAreas[aId].total++;
      }

      // Extraer tiempos por fase a partir del historial de movimientos
      const fasesTiempos = calcularTiemposFases(t, feriadosSet, now);

      return {
        id_tramite: t.id_tramite,
        numero_tramite: t.numero_quipux,
        numero_quipux: t.numero_quipux,
        proveedor_nombre: t.proveedor_beneficiario || "No especificado",
        proveedor_ruc: t.ruc_proveedor,
        tipo_proceso: t.tipos_tramite.nombre,
        tipo_codigo: t.tipos_tramite.codigo,
        fecha_ingreso_dfi: t.fecha_ingreso,
        estado_actual: t.estado_general,
        esta_pausado: Boolean(t.esta_pausado),
        custodio_nombre: t.usuarios?.nombre_completo || "Sin custodio",
        custodio_cargo: t.usuarios?.cargo || "N/A",
        area_nombre: t.areas?.nombre || "Sin área",
        dias_habiles_totales: diasHabilesNetos,
        dias_pausa_factura: diasPausa,
        dias_habiles_efectivos: diasEfectivos,
        alerta_sla: alerta,
        monto_solicitado: Number(t.monto_total || 0),
        fasesTiempos,
        total_observaciones: t.observaciones.length,
      };
    });

    const listaCustodios = Object.values(mapaCustodios).sort(
      (a, b) => b.total_tramites - a.total_tramites
    );

    const listaAreas = Object.values(mapaAreas).map((a) => ({
      ...a,
      porcentaje:
        totalIngresados > 0
          ? Math.round((a.total / totalIngresados) * 100)
          : 0,
    }));

    // -------------------------------------------------------------
    // REPORTE 2: ESTADÍSTICAS DE TARDANZA POR TIPO DE PROCESO
    // (Análisis de cuellos de botella: dónde y por qué se demora)
    // -------------------------------------------------------------
    const mapaTipos: Record<
      number,
      {
        id_tipo: number;
        codigo: string;
        nombre: string;
        total: number;
        dias_totales_acumulados: number;
        tramites_en_plazo: number;
        tramites_vencidos: number;
        dias_dfi_acum: number;
        dias_presupuesto_acum: number;
        dias_pausa_acum: number;
        dias_contabilidad_acum: number;
        dias_caja_acum: number;
      }
    > = {};

    // Métricas para Causas del Retraso ("¿Por qué se demora?")
    let tramitesConPausaFactura = 0;
    let diasPausaFacturaTotal = 0;

    let tramitesConObservaciones72h = 0;
    let totalObservacionesRegistradas = 0;

    let tramitesConDemoraContabilidad = 0;
    let diasDemoraContableTotal = 0;

    let tramitesConDemoraPresupuesto = 0;
    let diasDemoraPresupuestoTotal = 0;

    let tramitesConDemoraCaja = 0;

    tramitesDetalle.forEach((t) => {
      // Agrupar por tipo
      const tipoObj = tramites.find((orig) => orig.id_tramite === t.id_tramite)?.tipos_tramite;
      if (!tipoObj) return;

      const tId = tipoObj.id_tipo_tramite;
      if (!mapaTipos[tId]) {
        mapaTipos[tId] = {
          id_tipo: tId,
          codigo: tipoObj.codigo,
          nombre: tipoObj.nombre,
          total: 0,
          dias_totales_acumulados: 0,
          tramites_en_plazo: 0,
          tramites_vencidos: 0,
          dias_dfi_acum: 0,
          dias_presupuesto_acum: 0,
          dias_pausa_acum: 0,
          dias_contabilidad_acum: 0,
          dias_caja_acum: 0,
        };
      }

      mapaTipos[tId].total++;
      mapaTipos[tId].dias_totales_acumulados += t.dias_habiles_efectivos;

      if (t.dias_habiles_efectivos <= 6) {
        mapaTipos[tId].tramites_en_plazo++;
      } else {
        mapaTipos[tId].tramites_vencidos++;
      }

      mapaTipos[tId].dias_dfi_acum += t.fasesTiempos.dfi_dias;
      mapaTipos[tId].dias_presupuesto_acum += t.fasesTiempos.presupuesto_dias;
      mapaTipos[tId].dias_pausa_acum += t.fasesTiempos.pausa_factura_dias;
      mapaTipos[tId].dias_contabilidad_acum += t.fasesTiempos.contabilidad_dias;
      mapaTipos[tId].dias_caja_acum += t.fasesTiempos.caja_dias;

      // Evaluar Causas de Demora
      if (t.dias_pausa_factura > 0) {
        tramitesConPausaFactura++;
        diasPausaFacturaTotal += t.dias_pausa_factura;
      }

      if (t.total_observaciones > 0) {
        tramitesConObservaciones72h++;
        totalObservacionesRegistradas += t.total_observaciones;
      }

      if (t.fasesTiempos.contabilidad_dias >= 2) {
        tramitesConDemoraContabilidad++;
        diasDemoraContableTotal += t.fasesTiempos.contabilidad_dias;
      }

      if (t.fasesTiempos.presupuesto_dias >= 1.5) {
        tramitesConDemoraPresupuesto++;
        diasDemoraPresupuestoTotal += t.fasesTiempos.presupuesto_dias;
      }

      if (t.fasesTiempos.caja_dias >= 2) {
        tramitesConDemoraCaja++;
      }
    });

    const estadisticasTipos = Object.values(mapaTipos).map((item) => {
      const promedio_dias =
        item.total > 0
          ? Number((item.dias_totales_acumulados / item.total).toFixed(1))
          : 0;

      const dfi_prom =
        item.total > 0
          ? Number((item.dias_dfi_acum / item.total).toFixed(1))
          : 0;
      const presupuesto_prom =
        item.total > 0
          ? Number((item.dias_presupuesto_acum / item.total).toFixed(1))
          : 0;
      const pausa_prom =
        item.total > 0
          ? Number((item.dias_pausa_acum / item.total).toFixed(1))
          : 0;
      const contabilidad_prom =
        item.total > 0
          ? Number((item.dias_contabilidad_acum / item.total).toFixed(1))
          : 0;
      const caja_prom =
        item.total > 0
          ? Number((item.dias_caja_acum / item.total).toFixed(1))
          : 0;

      // Identificar fase con mayor demora
      const fasesArr = [
        { fase: "DFI (Ingreso / Derivación)", dias: dfi_prom },
        { fase: "Presupuesto (Certificación / Compromiso)", dias: presupuesto_prom },
        { fase: "Espera de Factura SRI (Pausa)", dias: pausa_prom },
        { fase: "Contabilidad (Devengado / Retenciones)", dias: contabilidad_prom },
        { fase: "Tesorería / Caja (Pago SPI)", dias: caja_prom },
      ];
      fasesArr.sort((a, b) => b.dias - a.dias);
      const faseMayorDemora = fasesArr[0]?.fase || "N/A";

      const tasa_cumplimiento =
        item.total > 0
          ? Math.round((item.tramites_en_plazo / item.total) * 100)
          : 100;

      return {
        id_tipo: item.id_tipo,
        codigo: item.codigo,
        nombre: item.nombre,
        total_tramites: item.total,
        promedio_dias_habiles: promedio_dias,
        tramites_en_plazo: item.tramites_en_plazo,
        tramites_vencidos: item.tramites_vencidos,
        tasa_cumplimiento,
        fases_promedio: {
          dfi: dfi_prom,
          presupuesto: presupuesto_prom,
          pausa_factura: pausa_prom,
          contabilidad: contabilidad_prom,
          caja: caja_prom,
        },
        fase_mayor_demora: faseMayorDemora,
      };
    });

    // Comparativo Global de Fases (El "Dónde se demora")
    let totalDfiDias = 0;
    let totalPresupuestoDias = 0;
    let totalPausaDias = 0;
    let totalContabilidadDias = 0;
    let totalCajaDias = 0;

    tramitesDetalle.forEach((t) => {
      totalDfiDias += t.fasesTiempos.dfi_dias;
      totalPresupuestoDias += t.fasesTiempos.presupuesto_dias;
      totalPausaDias += t.fasesTiempos.pausa_factura_dias;
      totalContabilidadDias += t.fasesTiempos.contabilidad_dias;
      totalCajaDias += t.fasesTiempos.caja_dias;
    });

    const n = Math.max(1, tramitesDetalle.length);
    const sumaPromedios =
      totalDfiDias / n +
      totalPresupuestoDias / n +
      totalContabilidadDias / n +
      totalCajaDias / n;

    const fasesComparativo = [
      {
        fase: "Recepción y Derivación DFI",
        area: "Dirección Financiera (DFI)",
        dias_promedio: Number((totalDfiDias / n).toFixed(1)),
        porcentaje_tiempo: Math.round(
          ((totalDfiDias / n) / Math.max(0.1, sumaPromedios)) * 100
        ),
        diagnostico: "Ágil (Trámite ingresado y derivado rápidamente)",
        alerta: "BAJO",
      },
      {
        fase: "Compromiso Presupuestario",
        area: "Presupuesto",
        dias_promedio: Number((totalPresupuestoDias / n).toFixed(1)),
        porcentaje_tiempo: Math.round(
          ((totalPresupuestoDias / n) / Math.max(0.1, sumaPromedios)) * 100
        ),
        diagnostico: "Moderado (Validación de partidas y certificación)",
        alerta: (totalPresupuestoDias / n) > 1.5 ? "MEDIO" : "BAJO",
      },
      {
        fase: "Control Previo y Devengado Contable",
        area: "Contabilidad",
        dias_promedio: Number((totalContabilidadDias / n).toFixed(1)),
        porcentaje_tiempo: Math.round(
          ((totalContabilidadDias / n) / Math.max(0.1, sumaPromedios)) * 100
        ),
        diagnostico: "Mayor Carga (Revisión documental, retenciones eSIGEF y CUR)",
        alerta: (totalContabilidadDias / n) > 2.0 ? "ALTO" : "MEDIO",
      },
      {
        fase: "Autorización y Pago SPI/BCE",
        area: "Tesorería / Caja",
        dias_promedio: Number((totalCajaDias / n).toFixed(1)),
        porcentaje_tiempo: Math.round(
          ((totalCajaDias / n) / Math.max(0.1, sumaPromedios)) * 100
        ),
        diagnostico: "Trámite final de dispersión bancaria y archivo",
        alerta: "BAJO",
      },
    ];

    // Causas de Demora ("¿Por qué se demora?")
    const causasDemora = [
      {
        causa: "Espera de Factura SRI del Proveedor (Pausa de SLA)",
        descripcion:
          "El expediente llega sin factura electrónica emitida; el SLA se congela hasta que el proveedor sube el comprobante al SRI.",
        tramites_afectados: tramitesConPausaFactura,
        porcentaje_afectacion: Math.round(
          (tramitesConPausaFactura / n) * 100
        ),
        impacto_promedio_dias:
          tramitesConPausaFactura > 0
            ? Number((diasPausaFacturaTotal / tramitesConPausaFactura).toFixed(1))
            : 0,
        categoria: "EXTERNO_PROVEEDOR",
      },
      {
        causa: "Subsanación de Novedades (Observaciones 72 Horas)",
        descripcion:
          "Expedientes devueltos a los administradores de contrato por faltante de firmas, actas o soportes normativos.",
        tramites_afectados: tramitesConObservaciones72h,
        porcentaje_afectacion: Math.round(
          (tramitesConObservaciones72h / n) * 100
        ),
        impacto_promedio_dias: 3.0,
        categoria: "INTERNO_ADMINISTRADOR",
      },
      {
        causa: "Complejidad en Retenciones y Asientos Contables",
        descripcion:
          "Trámites que requieren múltiples tablas de amortización, retenciones complejas o ajustes en eSIGEF.",
        tramites_afectados: tramitesConDemoraContabilidad,
        porcentaje_afectacion: Math.round(
          (tramitesConDemoraContabilidad / n) * 100
        ),
        impacto_promedio_dias:
          tramitesConDemoraContabilidad > 0
            ? Number((diasDemoraContableTotal / tramitesConDemoraContabilidad).toFixed(1))
            : 0,
        categoria: "INTERNO_CONTABILIDAD",
      },
      {
        causa: "Validación de Fondos y Partidas Presupuestarias",
        descripcion:
          "Retención temporal por verificación de disponibilidad presupuestaria institucional o reformas de partidas.",
        tramites_afectados: tramitesConDemoraPresupuesto,
        porcentaje_afectacion: Math.round(
          (tramitesConDemoraPresupuesto / n) * 100
        ),
        impacto_promedio_dias:
          tramitesConDemoraPresupuesto > 0
            ? Number((diasDemoraPresupuestoTotal / tramitesConDemoraPresupuesto).toFixed(1))
            : 0,
        categoria: "INTERNO_PRESUPUESTO",
      },
    ];

    causasDemora.sort((a, b) => b.tramites_afectados - a.tramites_afectados);

    // -------------------------------------------------------------
    // REPORTE 3: DESEMPEÑO POR FUNCIONARIO (HISTÓRICO EN PERIODO)
    // -------------------------------------------------------------
    const slaPorArea: Record<number, number> = {
      1: 2.0, // Dirección Financiera / Recepción
      2: 2.0, // Presupuesto
      3: 3.0, // Contabilidad / Control Previo
      4: 2.0, // Tesorería / Caja
    };

    const usuariosActivos = await prisma.usuarios.findMany({
      where: { activo: true },
      include: { areas: true },
      orderBy: { nombre_completo: "asc" },
    });

    const todosLosMovimientos = await prisma.historial_movimientos.findMany({
      include: {
        tramites: {
          include: { tipos_tramite: true },
        },
      },
      orderBy: { fecha_hora: "asc" },
    });

    const movsPorTramite: Record<number, typeof todosLosMovimientos> = {};
    todosLosMovimientos.forEach((m) => {
      if (!movsPorTramite[m.id_tramite]) {
        movsPorTramite[m.id_tramite] = [];
      }
      movsPorTramite[m.id_tramite].push(m);
    });

    const reporteDesempenoFuncionarios = usuariosActivos.map((usr) => {
      const slaLimite = slaPorArea[usr.id_area] || 2.5;

      const recepcionesEnPeriodo = todosLosMovimientos.filter((m) => {
        if (m.id_usuario_recibe !== usr.id_usuario) return false;
        if (!m.fecha_hora) return false;
        const f = new Date(m.fecha_hora);
        return f >= fechaDesde && f <= fechaHasta;
      });

      let totalDespachados = 0;
      let entregadosATiempo = 0;
      let entregadosConRetraso = 0;
      let enCursoActual = 0;
      let sumaDiasDespacho = 0;

      const detalleTramitesMesa: Array<{
        id_tramite: number;
        nro_tramite: string;
        numero_quipux: string;
        proveedor: string;
        tipo_proceso: string;
        fecha_llegada: string;
        fecha_salida: string | null;
        dias_en_mesa: number;
        estado_entrega: "A_TIEMPO" | "CON_RETRASO" | "EN_CURSO";
        sla_limite_dias: number;
      }> = [];

      recepcionesEnPeriodo.forEach((rec) => {
        const tramiteMovs = movsPorTramite[rec.id_tramite] || [];
        const fLlegada = new Date(rec.fecha_hora!);

        const siguienteDespacho = tramiteMovs.find((sig) => {
          if (!sig.fecha_hora) return false;
          const fSig = new Date(sig.fecha_hora);
          return fSig > fLlegada && sig.id_usuario_entrega === usr.id_usuario;
        });

        if (siguienteDespacho && siguienteDespacho.fecha_hora) {
          totalDespachados++;
          const fSalida = new Date(siguienteDespacho.fecha_hora);
          const diasMesa = Math.max(
            0.5,
            calcularDiasHabilesRango(fLlegada, fSalida, feriadosSet)
          );
          sumaDiasDespacho += diasMesa;

          const aTiempo = diasMesa <= slaLimite;
          if (aTiempo) {
            entregadosATiempo++;
          } else {
            entregadosConRetraso++;
          }

          detalleTramitesMesa.push({
            id_tramite: rec.id_tramite,
            nro_tramite: rec.tramites?.numero_quipux || `ID-${rec.id_tramite}`,
            numero_quipux: rec.tramites?.numero_quipux || `ID-${rec.id_tramite}`,
            proveedor: rec.tramites?.proveedor_beneficiario || "N/A",
            tipo_proceso: rec.tramites?.tipos_tramite?.nombre || "GENERAL",
            fecha_llegada: fLlegada.toISOString().split("T")[0],
            fecha_salida: fSalida.toISOString().split("T")[0],
            dias_en_mesa: Number(diasMesa.toFixed(1)),
            estado_entrega: aTiempo ? "A_TIEMPO" : "CON_RETRASO",
            sla_limite_dias: slaLimite,
          });
        } else {
          const diasMesa = Math.max(
            0.5,
            calcularDiasHabilesRango(fLlegada, now, feriadosSet)
          );
          const vencidoEnMesa = diasMesa > slaLimite;

          if (vencidoEnMesa) {
            entregadosConRetraso++;
          } else {
            enCursoActual++;
          }

          detalleTramitesMesa.push({
            id_tramite: rec.id_tramite,
            nro_tramite: rec.tramites?.numero_quipux || `ID-${rec.id_tramite}`,
            numero_quipux: rec.tramites?.numero_quipux || `ID-${rec.id_tramite}`,
            proveedor: rec.tramites?.proveedor_beneficiario || "N/A",
            tipo_proceso: rec.tramites?.tipos_tramite?.nombre || "GENERAL",
            fecha_llegada: fLlegada.toISOString().split("T")[0],
            fecha_salida: null,
            dias_en_mesa: Number(diasMesa.toFixed(1)),
            estado_entrega: vencidoEnMesa ? "CON_RETRASO" : "EN_CURSO",
            sla_limite_dias: slaLimite,
          });
        }
      });

      const totalRecibidos = recepcionesEnPeriodo.length;
      const totalEvaluables = entregadosATiempo + entregadosConRetraso;
      const tasaCumplimiento =
        totalEvaluables > 0
          ? Math.round((entregadosATiempo / totalEvaluables) * 100)
          : totalRecibidos > 0
          ? 100
          : 100;

      const tiempoPromedioDias =
        totalDespachados > 0
          ? Number((sumaDiasDespacho / totalDespachados).toFixed(1))
          : 0;

      return {
        id_usuario: usr.id_usuario,
        nombre_completo: usr.nombre_completo,
        cargo: usr.cargo,
        area_nombre: usr.areas?.nombre || "Área General",
        total_tramites_recibidos: totalRecibidos,
        tramites_despachados: totalDespachados,
        entregados_a_tiempo: entregadosATiempo,
        entregados_con_retraso: entregadosConRetraso,
        en_curso: enCursoActual,
        tasa_cumplimiento: tasaCumplimiento,
        tiempo_promedio_dias: tiempoPromedioDias,
        sla_limite_dias: slaLimite,
        detalle_tramites: detalleTramitesMesa,
      };
    });

    reporteDesempenoFuncionarios.sort(
      (a, b) => b.total_tramites_recibidos - a.total_tramites_recibidos
    );

    // -------------------------------------------------------------
    // REPORTE 4: CARGA ACTUAL EN MESA POR FUNCIONARIO (TIEMPO REAL)
    // -------------------------------------------------------------
    const tramitesActivos = await prisma.tramites.findMany({
      where: {
        estado_general: { not: "PAGADO" },
      },
      include: {
        usuarios: { include: { areas: true } },
        areas: true,
        tipos_tramite: true,
        historial_movimientos: {
          orderBy: { fecha_hora: "desc" },
          take: 1,
        },
      },
      orderBy: { fecha_ingreso: "asc" },
    });

    const mapaCargaActual: Record<
      number,
      {
        id_usuario: number;
        nombre_completo: string;
        cargo: string;
        area_nombre: string;
        total_tramites_actuales: number;
        dias_acumulados: number;
        en_plazo: number;
        en_riesgo: number;
        vencidos: number;
        tramites: Array<{
          id_tramite: number;
          nro_tramite: string;
          numero_quipux: string;
          proveedor_beneficiario: string;
          tipo_proceso: string;
          monto_total: number;
          fecha_llegada: string;
          dias_en_mesa: number;
          sla_limite_dias: number;
          semaforo_sla: "VERDE" | "AMARILLO" | "ROJO";
          estado_general: string;
        }>;
      }
    > = {};

    usuariosActivos.forEach((u) => {
      mapaCargaActual[u.id_usuario] = {
        id_usuario: u.id_usuario,
        nombre_completo: u.nombre_completo,
        cargo: u.cargo,
        area_nombre: u.areas?.nombre || "Área General",
        total_tramites_actuales: 0,
        dias_acumulados: 0,
        en_plazo: 0,
        en_riesgo: 0,
        vencidos: 0,
        tramites: [],
      };
    });

    tramitesActivos.forEach((t) => {
      const custodioId = t.id_custodio_actual;
      if (!mapaCargaActual[custodioId]) {
        mapaCargaActual[custodioId] = {
          id_usuario: custodioId,
          nombre_completo: t.usuarios?.nombre_completo || `Usuario ${custodioId}`,
          cargo: t.usuarios?.cargo || "Funcionario",
          area_nombre: t.areas?.nombre || "Área General",
          total_tramites_actuales: 0,
          dias_acumulados: 0,
          en_plazo: 0,
          en_riesgo: 0,
          vencidos: 0,
          tramites: [],
        };
      }

      const item = mapaCargaActual[custodioId];
      const slaLimite = slaPorArea[t.id_area_actual] || 2.5;

      const ultMov = t.historial_movimientos?.[0];
      const fechaLlegada = ultMov?.fecha_hora
        ? new Date(ultMov.fecha_hora)
        : t.fecha_ingreso
        ? new Date(t.fecha_ingreso)
        : now;

      const diasEnMesa = Math.max(
        0.5,
        calcularDiasHabilesRango(fechaLlegada, now, feriadosSet)
      );

      item.total_tramites_actuales++;
      item.dias_acumulados += diasEnMesa;

      let semaforo: "VERDE" | "AMARILLO" | "ROJO" = "VERDE";
      if (diasEnMesa > slaLimite) {
        semaforo = "ROJO";
        item.vencidos++;
      } else if (diasEnMesa >= slaLimite * 0.75) {
        semaforo = "AMARILLO";
        item.en_riesgo++;
      } else {
        semaforo = "VERDE";
        item.en_plazo++;
      }

      item.tramites.push({
        id_tramite: t.id_tramite,
        nro_tramite: t.numero_quipux || `ID-${t.id_tramite}`,
        numero_quipux: t.numero_quipux || `ID-${t.id_tramite}`,
        proveedor_beneficiario: t.proveedor_beneficiario || "N/A",
        tipo_proceso: t.tipos_tramite?.nombre || "GENERAL",
        monto_total: Number(t.monto_total || 0),
        fecha_llegada: fechaLlegada.toISOString().split("T")[0],
        dias_en_mesa: Number(diasEnMesa.toFixed(1)),
        sla_limite_dias: slaLimite,
        semaforo_sla: semaforo,
        estado_general: t.estado_general,
      });
    });

    const reporteCargaActualFuncionarios = Object.values(mapaCargaActual).map(
      (c) => ({
        id_usuario: c.id_usuario,
        nombre_completo: c.nombre_completo,
        cargo: c.cargo,
        area_nombre: c.area_nombre,
        total_tramites_actuales: c.total_tramites_actuales,
        tiempo_promedio_dias:
          c.total_tramites_actuales > 0
            ? Number((c.dias_acumulados / c.total_tramites_actuales).toFixed(1))
            : 0,
        en_plazo: c.en_plazo,
        en_riesgo: c.en_riesgo,
        vencidos: c.vencidos,
        tramites: c.tramites,
      })
    );

    reporteCargaActualFuncionarios.sort(
      (a, b) => b.total_tramites_actuales - a.total_tramites_actuales
    );

    return NextResponse.json({
      success: true,
      rango: {
        fecha_desde: fechaDesde.toISOString().split("T")[0],
        fecha_hasta: fechaHasta.toISOString().split("T")[0],
      },
      reporte_ingresos_custodia: {
        resumen: {
          total_ingresados: totalIngresados,
          total_en_proceso: totalEnProceso,
          total_pagados: totalPagados,
          total_observados_o_pausados: totalObservadosPausados,
        },
        custodia_por_usuario: listaCustodios,
        custodia_por_area: listaAreas,
        distribucion_estados: mapaEstados,
        tramites: tramitesDetalle,
      },
      reporte_tardanza_procesos: {
        por_tipo_proceso: estadisticasTipos,
        fases_comparativo: fasesComparativo,
        causas_demora: causasDemora,
      },
      reporte_desempeno_funcionarios: reporteDesempenoFuncionarios,
      reporte_carga_actual_funcionarios: reporteCargaActualFuncionarios,
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { success: false, error: "Error al generar los reportes institucionales" },
      { status: 500 }
    );
  }
}

// Función auxiliar para determinar el tiempo por fase a partir del historial
function calcularTiemposFases(
  tramite: any,
  feriadosSet: Set<string>,
  now: Date
) {
  const movs = tramite.historial_movimientos || [];
  let dfi_dias = 0.5; // Por defecto ingreso rápido
  let presupuesto_dias = 0;
  let pausa_factura_dias = tramite.dias_pausa_acumulados || 0;
  let contabilidad_dias = 0;
  let caja_dias = 0;

  // Analizar saltos entre áreas
  for (let i = 0; i < movs.length; i++) {
    const actual = movs[i];
    const siguiente = movs[i + 1];
    const fInicio = new Date(actual.fecha_hora);
    const fFin = siguiente ? new Date(siguiente.fecha_hora) : now;

    const diffDias = Math.max(
      0.1,
      Number(
        ((fFin.getTime() - fInicio.getTime()) / (1000 * 60 * 60 * 24)).toFixed(1)
      )
    );

    // Si el área de destino era DFI (id 1)
    if (actual.id_area_destino === 1) {
      dfi_dias += diffDias;
    }
    // Presupuesto (id 2)
    else if (actual.id_area_destino === 2) {
      presupuesto_dias += diffDias;
    }
    // Contabilidad (id 3)
    else if (actual.id_area_destino === 3) {
      contabilidad_dias += diffDias;
    }
    // Tesorería / Caja (id 4)
    else if (actual.id_area_destino === 4) {
      caja_dias += diffDias;
    }
  }

  // Si no hay suficientes movimientos, estimar a partir del estado actual
  if (movs.length === 0) {
    if (tramite.id_area_actual === 2) presupuesto_dias = 1.0;
    else if (tramite.id_area_actual === 3) contabilidad_dias = 1.5;
    else if (tramite.id_area_actual === 4) caja_dias = 1.0;
  }

  return {
    dfi_dias: Number(dfi_dias.toFixed(1)),
    presupuesto_dias: Number(presupuesto_dias.toFixed(1)),
    pausa_factura_dias: Number(pausa_factura_dias.toFixed(1)),
    contabilidad_dias: Number(contabilidad_dias.toFixed(1)),
    caja_dias: Number(caja_dias.toFixed(1)),
  };
}
