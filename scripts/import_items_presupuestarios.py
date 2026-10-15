import pymupdf
import sqlite3
import sys
import os

pdf_path = r"C:\Users\ADMIN\Downloads\clasificador_presupuestario_2026.pdf"
db_path = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")

if not os.path.exists(pdf_path):
    print(f"Error: PDF no encontrado en {pdf_path}")
    sys.exit(1)

if not os.path.exists(db_path):
    print(f"Error: Base de datos no encontrada en {db_path}")
    sys.exit(1)

print(f"Cargando clasificador desde {pdf_path}...")
doc = pymupdf.open(pdf_path)

items = []
seen_codes = set()

for page_num in range(len(doc)):
    page = doc[page_num]
    tabs = page.find_tables()
    for tab in tabs.tables:
        rows = tab.extract()
        current_item = None
        for r in rows:
            if not r:
                continue
            first_val = str(r[0] or "").strip()
            if "CODIGO" in first_val or "NOMBRE" in str(r[-1] or ""):
                continue
            
            code_parts = [
                str(col).strip()
                for col in r[:-1]
                if col is not None and str(col).strip() != "" and str(col).strip() != "None"
            ]
            name_desc = str(r[-1] or "").strip()
            
            if code_parts and any(p.isdigit() for p in code_parts):
                code = "".join(code_parts).replace(".", "")
                lines = [l.strip() for l in name_desc.split("\n") if l.strip()]
                name = lines[0] if lines else ""
                desc = "\n".join(lines[1:]) if len(lines) > 1 else ""
                
                # Check uniqueness of code
                if code in seen_codes:
                    # Update description if needed
                    continue
                seen_codes.add(code)
                current_item = {"codigo": code, "nombre": name, "descripcion": desc}
                items.append(current_item)
            elif current_item and name_desc:
                if not current_item["descripcion"]:
                    current_item["descripcion"] = name_desc
                else:
                    current_item["descripcion"] += " " + name_desc

print(f"Total de items clasificados extraídos del PDF: {len(items)}")

# Conectar a SQLite y guardar en items_presupuestarios
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Verificar estructura
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='items_presupuestarios'")
if not cur.fetchone():
    print("Creando tabla items_presupuestarios...")
    cur.execute("""
        CREATE TABLE items_presupuestarios (
            id_item INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            activo BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

# Insertar o actualizar
inserted = 0
updated = 0
for it in items:
    cur.execute("SELECT id_item FROM items_presupuestarios WHERE codigo = ?", (it["codigo"],))
    row = cur.fetchone()
    if row:
        cur.execute(
            "UPDATE items_presupuestarios SET nombre = ?, descripcion = ?, activo = 1 WHERE codigo = ?",
            (it["nombre"], it["descripcion"], it["codigo"])
        )
        updated += 1
    else:
        cur.execute(
            "INSERT INTO items_presupuestarios (codigo, nombre, descripcion, activo) VALUES (?, ?, ?, 1)",
            (it["codigo"], it["nombre"], it["descripcion"])
        )
        inserted += 1

conn.commit()
conn.close()

print(f"Listo! Insertados: {inserted}, Actualizados: {updated}. Total en BD: {inserted + updated}")
