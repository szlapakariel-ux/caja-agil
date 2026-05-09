# Caja Simple MVP

Sistema de caja para librerías y comercios. Registrá ventas, egresos, cierres y movimientos de caja de forma rápida y simple.

---

## 1. ¿Qué es esta app?

**Caja Simple MVP** es una aplicación web responsive (mobile-first) diseñada para que una librería escolar/comercial registre todos los movimientos de caja diarios sin complicaciones.

Permite registrar ventas rápidas, egresos, retiros y aportes de la dueña, ajustes de caja, y hacer cierres parciales y finales. Todo con trazabilidad de quién hizo qué y cuándo.

---

## 2. ¿Qué problema resuelve?

- Evita llevar la caja en papel o en hojas de cálculo
- Permite a empleados registrar ventas sin acceso a información sensible
- Le da a la dueña visibilidad completa del movimiento del día
- Controla egresos pendientes de aprobación
- Mantiene historial de movimientos por fecha

---

## 3. ¿Qué incluye el MVP?

- ✅ Selección de usuario con roles (Admin / Empleado)
- ✅ PIN demo para la dueña/admin
- ✅ Registro de ventas ultrarrápido (monto + medio de pago)
- ✅ Registro de egresos con descripción y aprobación
- ✅ Egreso de empleado queda pendiente de revisión de Vanina
- ✅ Aprobación/rechazo/corrección de egresos por admin
- ✅ Retiro de dueña (tipo separado)
- ✅ Aporte de dueña (tipo separado)
- ✅ Ajuste de caja con motivo obligatorio
- ✅ Apertura de caja con saldo inicial
- ✅ Movimientos sin caja abierta (marcados especialmente)
- ✅ Cierre parcial (empleados y admin)
- ✅ Cierre final (solo admin)
- ✅ Panel diario con resumen completo
- ✅ Saldo separado por medio de pago
- ✅ Últimos 10 movimientos en el dashboard
- ✅ Detalle de cada movimiento con auditoría
- ✅ Corrección de movimientos con registro de auditoría
- ✅ Anulación de movimientos con motivo (no se borra nada)
- ✅ Historial de movimientos por fecha
- ✅ Modo claro y oscuro con preferencia en navegador
- ✅ Configuración mínima (nombre, medios de pago, usuarios)
- ✅ Seed con datos demo listos para demo
- ✅ Tests de reglas de caja (31 tests)
- ✅ Preparada para Railway (sin deploy automático)

---

## 4. ¿Qué NO incluye el MVP?

- ❌ Stock, productos ni inventario
- ❌ Facturación fiscal (AFIP)
- ❌ Login completo con JWT/sesiones reales
- ❌ Pagos reales (Mercado Pago API)
- ❌ Exportación CSV/Excel
- ❌ Gráficos complejos
- ❌ Multiempresa real
- ❌ Proveedores con historial
- ❌ Categorías de gastos fijos
- ❌ Deploy automático
- ❌ App móvil nativa o PWA completa

---

## 5. Cómo instalar dependencias

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd caja-agil

# Instalar dependencias
npm install
```

---

## 6. Cómo configurar PostgreSQL

### Opción A — PostgreSQL local

1. Tener PostgreSQL instalado (v14 o superior recomendado)
2. Crear la base de datos:

```sql
CREATE DATABASE caja_agil;
```

3. Copiar el archivo de ejemplo de entorno:

```bash
cp .env.example .env
```

4. Editar `.env` con tus credenciales:

```env
DATABASE_URL="postgresql://TU_USUARIO:TU_CONTRASEÑA@localhost:5432/caja_agil?schema=public"
```

### Opción B — Railway

Ver sección 11 (Cómo prepararla para Railway).

---

## 7. Cómo correr migraciones

```bash
# Crear y aplicar las migraciones
npm run db:migrate

# Si ya existe la base de datos y querés reiniciar todo
npm run db:reset
```

---

## 8. Cómo cargar datos demo

```bash
npm run db:seed
```

Esto crea:
- **Vanina** (Admin) — PIN demo: `1234`
- **Empleado 1** (sin PIN)
- **Empleado 2** (sin PIN)
- Caja abierta con movimientos del día
- Ventas, egresos, retiro, aporte, ajuste, cierre parcial

---

## 9. Cómo correr la app localmente

```bash
# Generar cliente Prisma (si no está generado)
npm run db:generate

# Correr en modo desarrollo
npm run dev
```

La app estará disponible en: [http://localhost:3000](http://localhost:3000)

---

## 10. Cómo correr tests

```bash
npm test
```

Los tests cubren las reglas de caja:
- Venta suma saldo
- Egreso resta saldo
- Retiro de dueña resta saldo
- Aporte de dueña suma saldo
- Ajuste positivo suma
- Ajuste negativo resta
- Movimiento anulado no impacta saldo
- Movimiento rechazado no impacta saldo
- Egreso pendiente sí impacta saldo
- Cierre parcial calcula diferencia
- Cierre final calcula diferencia
- Solo admin puede anular, corregir, hacer cierre final
- Movimiento sin caja queda marcado correctamente
- Corrección guarda auditoría
- Y más...

---

## 11. Cómo prepararla para Railway

1. Crear cuenta en [Railway](https://railway.app)
2. Crear un nuevo proyecto desde GitHub
3. Agregar un plugin de **PostgreSQL** al proyecto
4. En las variables de entorno del servicio, configurar:

```env
DATABASE_URL=<url-que-te-da-railway>
```

5. En la sección de comandos del deploy, configurar:

```
# Build command:
npm run build

# Start command:
npm start

# Post-deploy (opcional, para correr migraciones):
npx prisma migrate deploy && npm run db:seed
```

> **Importante:** El seed solo debería correrse una vez en demo. En producción real, no correr el seed después del primer deploy.

---

## 12. Guía simple para Vanina

### Flujo básico del día

1. **Abrir la app** en el celular, tablet o computadora
2. **Seleccionar "Vanina"** en la pantalla de usuarios
3. **Ingresar PIN** `1234`
4. En el **Panel del día**, tocar **"Abrir caja"** e ingresar el saldo inicial en efectivo
5. Durante el día: registrar ventas tocando el botón grande **"Registrar venta"**
6. Los empleados pueden registrar sus propias ventas y egresos
7. Los **egresos de empleados** aparecen como "Pendiente" — Vanina los revisa desde el detalle del movimiento
8. Para hacer un **cierre parcial** a media jornada: ir a **Cierres**, tocar "Cierre parcial", ingresar el monto contado
9. Al final del día: ir a **Cierres**, tocar **"Cierre final"**, ingresar el monto total contado
10. La app muestra la diferencia entre lo esperado y lo contado

### Acciones de admin (solo Vanina)

- **Aprobar egreso**: Tocar el movimiento → "Aprobar"
- **Rechazar egreso**: Tocar el movimiento → "Rechazar y anular"
- **Corregir movimiento**: Tocar el movimiento → "Corregir" → ingresar motivo
- **Anular movimiento**: Tocar el movimiento → "Anular" → ingresar motivo
- **Retiro de dueña**: Dashboard → "Retiro dueña"
- **Aporte de dueña**: Dashboard → "Aporte dueña"
- **Ajuste de caja**: Dashboard → "Ajuste de caja" → elegir positivo/negativo → ingresar motivo obligatorio

---

## 13. Flujo de prueba paso a paso

### Setup inicial

```bash
npm install
cp .env.example .env
# Editar .env con tu DATABASE_URL
npm run db:migrate
npm run db:seed
npm run dev
```

### Flujo de demo

1. **Abrir** [http://localhost:3000](http://localhost:3000)
2. **Seleccionar "Vanina"** → ingresar PIN `1234` → ingresar
3. Ver el **panel del día** con movimientos demo ya cargados
4. Tocar **"Abrir caja"** si no está abierta → ingresar saldo inicial $5000
5. Tocar **"Registrar venta"** → ingresar $3500 → Efectivo → Guardar
6. Tocar el nombre de usuario arriba → **"Cambiar usuario"** → seleccionar **Empleado 1**
7. Registrar venta: $1200 → Transferencia → Guardar
8. Registrar egreso: $800 → Efectivo → "Compra de bolsas" → Guardar (queda pendiente)
9. Cambiar a **Vanina** → ingresar PIN `1234`
10. Ver el **alerta de egreso pendiente** en el dashboard
11. Tocar el egreso pendiente → **"Aprobar"**
12. Ir a **Cierres** → tocar "Cierre parcial" → ingresar monto contado → ver diferencia → confirmar
13. Ver el cierre aprobado automáticamente (ya que lo hizo Vanina)
14. Ir a **Historial** → cambiar fecha para ver días anteriores
15. Tocar cualquier movimiento → ver detalle completo con auditoría
16. Tocar "Corregir" en un movimiento → ingresar motivo → guardar
17. Ver el movimiento marcado como "Corregido" con historial de cambios
18. Ir a **Cierres** → tocar **"Cierre final"** → ingresar monto contado → confirmar
19. Ver el resumen final del día

---

## Notas de seguridad

> **⚠️ IMPORTANTE:** El PIN demo (`1234`) es solo para fines de demostración y NO reemplaza un sistema de autenticación real. En un entorno de producción real, se debe implementar autenticación segura con sesiones, JWT o similar antes de exponer la app a Internet.

---

## Stack técnico

- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript
- **Base de datos:** PostgreSQL
- **ORM:** Prisma 7
- **Estilos:** Tailwind CSS 4
- **Temas:** next-themes (claro/oscuro)
- **Tests:** Jest + ts-jest
- **Deploy:** Preparado para Railway

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión a PostgreSQL | `postgresql://user:pass@localhost:5432/caja_agil` |

---

*Caja Simple MVP — Demo para librería escolar/comercial*
