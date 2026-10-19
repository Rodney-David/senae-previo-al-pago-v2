import { prisma } from '../src/lib/prisma';

async function main() {
  const all = await prisma.tramites.findMany({
    select: { id_tramite: true, codigo_tramite: true, numero_quipux: true }
  });
  
  const multi = all.filter(t => {
    const q = t.numero_quipux;
    if (!q) return false;
    // Check if contains multiple SENAE or space-separated Quipux
    const matches = q.match(/SENAE-[A-Z0-9]+-\d{4}-\d+-[A-Z]+/gi) || [];
    return matches.length > 1 || q.includes('\n') || q.includes('\r');
  });

  console.log('Total tramites with multiple quipux in numero_quipux:', multi.length);
  for (const m of multi) {
    console.log(`ID: ${m.id_tramite} (${m.codigo_tramite}): ${m.numero_quipux}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
