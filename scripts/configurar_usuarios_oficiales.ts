import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== CONFIGURACIÓN DE FUNCIONARIOS OFICIALES SENAE ===");

  // 1. Limpiar iniciales de usuarios genéricos que tenían asignación provisional
  await prisma.usuarios.updateMany({
    where: { id_usuario: { in: [9, 10] } },
    data: { iniciales: null },
  });

  // 2. Actualizar funcionarios principales 2026 existentes
  const actualizacionesPrincipales = [
    {
      id_usuario: 4,
      nombre_completo: "Ricardo Gonzalez",
      correo_institucional: "ricardo.gonzalez@aduana.gob.ec",
      cargo: "Analista de Presupuesto",
      rol: "ANALISTA",
      id_area: 2,
      iniciales: "RG",
      activo: true,
    },
    {
      id_usuario: 5,
      nombre_completo: "David Barberan",
      correo_institucional: "david.barberan@aduana.gob.ec",
      cargo: "Analista de Presupuesto",
      rol: "ANALISTA",
      id_area: 2,
      iniciales: "DB",
      activo: true,
    },
    {
      id_usuario: 7,
      nombre_completo: "Nandy Morales",
      correo_institucional: "nandy.morales@aduana.gob.ec",
      cargo: "Analista de Presupuesto",
      rol: "ANALISTA",
      id_area: 2,
      iniciales: "NM",
      activo: true,
    },
    {
      id_usuario: 12,
      nombre_completo: "María Silva",
      correo_institucional: "maria.silva@aduana.gob.ec",
      cargo: "Analista de Presupuesto",
      rol: "ANALISTA",
      id_area: 2,
      iniciales: "MS",
      activo: true,
    },
    {
      id_usuario: 13,
      nombre_completo: "Ivonne de la Torre",
      correo_institucional: "ivonne.delatorre@aduana.gob.ec",
      cargo: "Analista de Presupuesto",
      rol: "ANALISTA",
      id_area: 2,
      iniciales: "ID",
      activo: true,
    },
  ];

  for (const u of actualizacionesPrincipales) {
    await prisma.usuarios.update({
      where: { id_usuario: u.id_usuario },
      data: {
        nombre_completo: u.nombre_completo,
        correo_institucional: u.correo_institucional,
        cargo: u.cargo,
        rol: u.rol,
        id_area: u.id_area,
        iniciales: u.iniciales,
        activo: u.activo,
      },
    });
    console.log(`- Actualizado: ${u.nombre_completo} (${u.iniciales}) [Presupuesto]`);
  }

  // 3. Crear o actualizar nuevos funcionarios oficiales (principales y adicionales)
  const nuevosFuncionarios = [
    {
      nombre_completo: "Hilda Arriaga",
      correo_institucional: "hilda.arriaga@aduana.gob.ec",
      cargo: "Analista de Cobranzas y Garantías",
      rol: "ANALISTA",
      id_area: 5, // Gestión de Cobranzas y Garantías
      iniciales: "HA",
      activo: true,
    },
    {
      nombre_completo: "Maria Rodriguez",
      correo_institucional: "maria.rodriguez@aduana.gob.ec",
      cargo: "Analista de Presupuesto",
      rol: "ANALISTA",
      id_area: 2, // Presupuesto
      iniciales: "MR",
      activo: true,
    },
    {
      nombre_completo: "Gabriela Peralta",
      correo_institucional: "gabriela.peralta@aduana.gob.ec",
      cargo: "Analista de Tesorería",
      rol: "ANALISTA",
      id_area: 4, // Tesorería / Caja
      iniciales: "GP",
      activo: true,
    },
    {
      nombre_completo: "Raúl Lindao",
      correo_institucional: "raul.lindao@aduana.gob.ec",
      cargo: "Analista de Contabilidad",
      rol: "ANALISTA",
      id_area: 3, // Contabilidad
      iniciales: "RL",
      activo: true,
    },
    {
      nombre_completo: "Andrea Carrillo",
      correo_institucional: "andrea.carrillo@aduana.gob.ec",
      cargo: "Servidora Aduanera - Distrito Guayaquil",
      rol: "ANALISTA",
      id_area: 7, // Requirente / Distrito
      iniciales: "AC",
      activo: true,
    },
    {
      nombre_completo: "Roberto Armijo",
      correo_institucional: "roberto.armijo@aduana.gob.ec",
      cargo: "Servidor Aduanero - Distrito Guayaquil",
      rol: "ANALISTA",
      id_area: 7, // Requirente / Distrito
      iniciales: "RA",
      activo: true,
    },
    {
      nombre_completo: "Ana García",
      correo_institucional: "ana.garcia@aduana.gob.ec",
      cargo: "Ex-Analista de Presupuesto (Saliente)",
      rol: "ANALISTA",
      id_area: 2, // Presupuesto
      iniciales: "AG",
      activo: false, // Saliente
    },
    {
      nombre_completo: "Vicente León",
      correo_institucional: "vicente.leon@aduana.gob.ec",
      cargo: "Ex-Analista de Presupuesto (Saliente)",
      rol: "ANALISTA",
      id_area: 2, // Presupuesto
      iniciales: "VL",
      activo: false, // Saliente
    },
    {
      nombre_completo: "Verónica Paguay",
      correo_institucional: "veronica.paguay@aduana.gob.ec",
      cargo: "Ex-Analista de Presupuesto (Saliente)",
      rol: "ANALISTA",
      id_area: 2, // Presupuesto
      iniciales: "VP",
      activo: false, // Saliente
    },
  ];

  for (const fn of nuevosFuncionarios) {
    const existe = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { iniciales: fn.iniciales },
          { correo_institucional: fn.correo_institucional },
        ],
      },
    });

    if (existe) {
      await prisma.usuarios.update({
        where: { id_usuario: existe.id_usuario },
        data: {
          nombre_completo: fn.nombre_completo,
          correo_institucional: fn.correo_institucional,
          cargo: fn.cargo,
          rol: fn.rol,
          id_area: fn.id_area,
          iniciales: fn.iniciales,
          activo: fn.activo,
        },
      });
      console.log(`- Actualizado existente: ${fn.nombre_completo} (${fn.iniciales})`);
    } else {
      const creado = await prisma.usuarios.create({
        data: {
          nombre_completo: fn.nombre_completo,
          correo_institucional: fn.correo_institucional,
          cargo: fn.cargo,
          rol: fn.rol,
          id_area: fn.id_area,
          iniciales: fn.iniciales,
          activo: fn.activo,
          estado_disponibilidad: fn.activo ? "DISPONIBLE" : "NO_DISPONIBLE",
        },
      });
      console.log(`+ Creado nuevo: ${creado.nombre_completo} (${creado.iniciales}) [ID: ${creado.id_usuario}]`);
    }
  }

  // 4. Mostrar listado final de funcionarios con iniciales
  const todosConIniciales = await prisma.usuarios.findMany({
    where: { iniciales: { not: null } },
    include: { areas: { select: { nombre: true, codigo: true } } },
    orderBy: { id_usuario: "asc" },
  });

  console.log("\n=======================================================");
  console.log("CATÁLOGO OFICIAL DE FUNCIONARIOS CON INICIALES:");
  console.table(
    todosConIniciales.map((u) => ({
      ID: u.id_usuario,
      Iniciales: u.iniciales,
      Nombre: u.nombre_completo,
      Correo: u.correo_institucional,
      Area: u.areas?.codigo || u.id_area,
      Cargo: u.cargo,
      Estado: u.activo ? "ACTIVO" : "SALIENTE",
    }))
  );
  console.log("=======================================================");
}

main()
  .catch((e) => {
    console.error("Error al configurar funcionarios:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
