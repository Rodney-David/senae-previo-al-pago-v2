export type RolInstitucional =
  | "ADMIN"
  | "DIRECTORA"
  | "SECRETARIA"
  | "JEFE_PRESUPUESTO"
  | "ANALISTA_PRESUPUESTO"
  | "CONTADOR_GENERAL"
  | "ANALISTA_CONTABILIDAD"
  | "TESORERO_GENERAL"
  | "TECNICO_COBRANZAS"
  | "CUSTODIO_ARCHIVO";

export interface UsuarioInstitucional {
  id_usuario: number;
  nombre_completo: string;
  correo_institucional: string;
  cargo: string;
  rol: string;
  id_area: number;
  activo?: boolean | null;
  estado_disponibilidad?: string | null;
  area_nombre?: string;
  area_codigo?: string;
}

export type SemaforoSLA = "EN_PLAZO" | "POR_VENCER" | "VENCIDO" | "PAUSADO";

export interface SLAResult {
  diasHabilesTranscurridos: number;
  diasRestantes: number;
  estado: SemaforoSLA;
  estaPausado: boolean;
  motivoPausa?: string | null;
  porcentajeConsumido: number;
}

export interface TramiteReferenciaDTO {
  id_referencia: number;
  id_tramite: number;
  tipo_documento: string;
  tipo_personalizado?: string | null;
  numero_documento: string;
  fecha_documento: string | Date;
  asunto_sumilla: string;
  id_usuario_registro: number;
  created_at?: string | Date | null;
  usuario_nombre?: string;
}

export interface HistorialMovimientoDTO {
  id_movimiento: number;
  id_tramite: number;
  tipo_accion: string;
  comentarios?: string | null;
  fecha_hora: string | Date | null;
  usuario_entrega?: {
    id_usuario: number;
    nombre_completo: string;
    cargo: string;
  };
  usuario_recibe?: {
    id_usuario: number;
    nombre_completo: string;
    cargo: string;
  };
  area_origen?: {
    id_area: number;
    nombre: string;
    codigo: string;
  };
  area_destino?: {
    id_area: number;
    nombre: string;
    codigo: string;
  };
}

export interface ObservacionDTO {
  id_observacion: number;
  id_tramite: number;
  detalle_observacion: string;
  fecha_reporte: string | Date | null;
  estado_observacion: string | null;
  respuesta_observacion?: string | null;
  fecha_respuesta?: string | Date | null;
  id_area_origen?: number;
  id_area_destino?: number;
  id_usuario_reporta?: number;
  usuario_reporta?: {
    id_usuario: number;
    nombre_completo: string;
    cargo: string;
  };
  usuario_responde?: {
    id_usuario: number;
    nombre_completo: string;
    cargo: string;
  };
  area_reporta?: {
    id_area: number;
    nombre: string;
    codigo: string;
  };
}

export interface TramiteCompletoDTO {
  id_tramite: number;
  codigo_tramite: string;
  numero_quipux: string;
  fecha_memorando: string | Date | null;
  fecha_recepcion_fisica: string | Date | null;
  id_tipo_tramite: number;
  tipo_tramite?: {
    id_tipo_tramite: number;
    nombre: string;
    codigo: string;
    tipo_cur_permitido?: string | null;
    requiere_item_presupuestario?: boolean | null;
    requiere_factura?: boolean | null;
  };
  tipos_tramite?: {
    id_tipo_tramite: number;
    nombre: string;
    codigo: string;
    tipo_cur_permitido?: string | null;
    requiere_item_presupuestario?: boolean | null;
    requiere_factura?: boolean | null;
  } | null;
  tipo_flujo: string;
  proveedor_beneficiario: string;
  ruc_proveedor?: string | null;
  subtotal?: number | string | null;
  monto_iva?: number | string | null;
  monto_retenciones?: number | string | null;
  monto_multas?: number | string | null;
  monto_total: number | string;
  es_alta_cuantia?: boolean | null;
  
  // Presupuesto
  certificacion_presupuestaria?: string | null;
  item_presupuestario?: string | null;
  numero_cur_compromiso?: string | null;
  aprobado_presupuesto?: boolean | null;
  fecha_aprobacion_presupuesto?: string | Date | null;
  id_usuario_aprobador_presupuesto?: number | null;
  usuario_aprobador_presupuesto?: UsuarioInstitucional | null;
  
  // Factura y SLA
  numero_factura?: string | null;
  fecha_factura?: string | Date | null;
  esta_pausado?: boolean | null;
  motivo_pausa?: string | null;
  fecha_pausa?: string | Date | null;
  dias_pausa_acumulados?: number | null;

  // Contabilidad
  numero_cur_devengado?: string | null;
  numero_cur_contable?: string | null;
  aprobado_contabilidad?: boolean | null;
  fecha_aprobacion_contabilidad?: string | Date | null;
  id_usuario_aprobador_contabilidad?: number | null;
  usuario_aprobador_contabilidad?: UsuarioInstitucional | null;
  
  // DFI Pago
  autorizado_pago?: boolean | null;
  fecha_autorizacion_pago?: string | Date | null;
  id_usuario_autoriza_pago?: number | null;
  usuario_autoriza_pago?: UsuarioInstitucional | null;

  // Tesorería / Cobranzas
  lote_mef?: string | null;
  spi_bce_referencia?: string | null;
  comprobante_pago?: string | null;
  fecha_pago?: string | Date | null;

  // Archivo
  fojas_fisicas?: number | null;
  codigo_tomo_caja?: string | null;
  estanteria?: string | null;
  ubicacion_archivo?: string | null;

  // Estados y Custodio
  id_area_actual: number;
  areas?: {
    id_area: number;
    nombre: string;
    codigo: string;
  } | null;
  area_actual?: {
    id_area: number;
    nombre: string;
    codigo: string;
  };
  id_custodio_actual: number;
  usuarios?: {
    id_usuario: number;
    nombre_completo: string;
    cargo: string;
    rol: string;
  } | null;
  custodio_actual?: UsuarioInstitucional | null;
  estado_general: string;
  sub_estado: string;
  es_devuelto?: boolean | null;
  motivo_devolucion?: string | null;

  // Novedades y Timestamps
  fecha_ingreso: string | Date | null;
  fecha_ultimo_movimiento: string | Date | null;
  fecha_ultima_modificacion: string | Date | null;
  
  // Campos dinámicos Json
  campos_personalizados?: Record<string, unknown> | null;
  anexos?: string | null;
  numero_liquidacion?: string | null;
  numero_juicio?: string | null;

  // Relaciones
  tramite_referencias?: TramiteReferenciaDTO[];
  historial_movimientos?: HistorialMovimientoDTO[];
  observaciones?: ObservacionDTO[];
  sla?: SLAResult;
}
