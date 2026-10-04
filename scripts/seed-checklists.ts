import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "senae_salt_2026").digest("hex");
}

async function main() {
  console.log("Cargando plantillas de checklist oficial SENAE...");

  const jsonPath = path.join(process.cwd(), "data", "checklists", "checklist_templates.json");
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const templates = JSON.parse(rawData);

  // Mapeo entre hoja del manual SENAE y códigos de tipos de trámite
  const templateMapping: Record<string, string[]> = {
    "Servicios básicos": ["SERV_BASICOS"],
    "Infima cuantía": ["INFIMA_CUANTIA"],
    "Contratos": ["CONTRATACION_SNCP", "CONTRATO_DNTH", "POLIZAS_SEGUROS", "CONVENIOS_PAGO", "CONV_INTERINST"],
    "Caja chica": ["CAJA_CHICA"],
    "Garantías rendidas en efectivo": ["GARANTIAS_ADUANA"],
    "Devolución de cauciones": ["DEV_CAUCIONES"],
    "Comisión de servicios Int y Ext": ["VIATICOS_FUNC"],
    "Aplicación de Caución": ["IMPUT_CAUCION"],
    "Fondo a rendir cuentas": ["REEMBOLSOS_GASTOS"],
  };

  let totalRequisitos = 0;

  for (const tpl of templates) {
    const sheetName = tpl.sheet?.trim();
    const codigosDestino = templateMapping[sheetName] || [];

    for (const codigo of codigosDestino) {
      const tipoTramite = await prisma.tipos_tramite.findFirst({
        where: { codigo },
      });

      if (!tipoTramite) {
        console.warn(`Tipo de trámite no encontrado para código: ${codigo}`);
        continue;
      }

      console.log(`Poblando checklist para ${tipoTramite.nombre} (${codigo}) desde [${sheetName}]...`);

      for (const row of tpl.rows) {
        const desc = row.requirement?.trim() || "";
        const num = parseInt(row.number, 10) || 1;

        // Verificar si ya existe este requisito para evitar duplicados
        const exists = await prisma.requisitos_checklist.findFirst({
          where: {
            id_tipo_tramite: tipoTramite.id_tipo_tramite,
            descripcion: desc,
          },
        });

        if (!exists) {
          await prisma.requisitos_checklist.create({
            data: {
              id_tipo_tramite: tipoTramite.id_tipo_tramite,
              fase: "PRESUPUESTO",
              descripcion: desc,
              orden: num,
              es_obligatorio: true,
              activo: true,
            },
          });
          totalRequisitos++;
        }
      }
    }
  }

  console.log(`¡Checklist oficial importado! Total requisitos sembrados: ${totalRequisitos}`);

  // Actualizar contraseñas de todos los usuarios institucionales con clave por defecto: senae2026
  console.log("Actualizando contraseñas institucionales por defecto (senae2026)...");
  const defaultHash = hashPassword("senae2026");

  const updateResult = await prisma.usuarios.updateMany({
    data: {
      password_hash: defaultHash,
    },
  });

  console.log(`Se actualizaron ${updateResult.count} usuarios institucionales con clave de acceso.`);
}

main()
  .catch((e) => {
    console.error("Error sembrando checklists:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
