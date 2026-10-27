# 💈 Elite Studio POS - Punto de Venta & Gestión de Salón

Sistema integral de punto de venta (POS) y gestión operativa para salones de belleza, peluquerías y barberías, construido con arquitectura desacoplada full-stack: **React + TypeScript + Vite + Tailwind CSS v4** en el frontend, y **Node.js + Express + TypeScript + SQLite local (WAL & Transacciones atómicas)** en el backend.

---

## 🚀 Características Principales

1. **Base de Datos 100% Local con SQLite**:
   - Persistencia local y configurable sin dependencias externas ni conexión a internet (`DATABASE_PATH=./data/elite_pos.db`).
   - Modo WAL (*Write-Ahead Logging*) y llaves foráneas activadas para máxima concurrencia y seguridad.
   - Creación automática de tablas y datos semilla iniciales al arrancar.
   - Transacciones atómicas seguras para ventas: inserción de comprobante, descuento de stock en tiempo real, registro de comisiones y actualización de gaveta de caja.
   - Sistema de copias de seguridad automáticas y manuales con restauración íntegra.

2. **Autenticación y Control de Accesos (RBAC)**:
   - Usuarios reales en SQLite con hashing criptográfico mediante `bcryptjs`.
   - Sesiones gestionadas con tokens JWT (expiración de 7 días) y almacenamiento seguro en el cliente.
   - Protección de rutas y verificación de permisos para Administradores y Cajeros tanto en cliente como en servidor.

3. **Tema Dual: Modo Claro y Modo Oscuro**:
   - Conmutador visual accesible con un clic (icono Sol/Luna en Navbar y Login).
   - Preferencia recordada automáticamente en `localStorage`.
   - Adaptación completa de todas las interfaces: Login, Carrito, Catálogo, Historial de Ventas, Inventario, Estilistas, Caja y Reportes.

4. **Terminal POS & Carrito Optimizado**:
   - Sección renombrada a **«Carrito»** con eliminación de campos de cliente o WhatsApp para maximizar la velocidad de cobro.
   - Formato de moneda Guaraní de Paraguay (`₲`).
   - Modal de cobro en efectivo rediseñado: campo único, centrado, con tipografía gigante y formateo dinámico con separador de miles (`.`) preservando la posición exacta del cursor.
   - Validación instantánea de importe suficiente y cálculo en tiempo real del vuelto.

---

## 📁 Estructura del Proyecto

```text
elite-studio-pos/
│
├── frontend/                        # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/          # ToastContainer y avisos globales
│   │   │   ├── layouts/             # MainLayout (Navbar + Sidebar + Viewport)
│   │   │   ├── pages/               # PosPage, SalesPage, InventoryPage, StylistsPage, CashRegisterPage, ReportsPage
│   │   │   ├── routes/              # AppRouter (enrutamiento interno)
│   │   │   └── providers/           # Proveedores de estado
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Badge, Modal con soporte de tema claro/oscuro
│   │   │   └── shared/              # Navbar (con toggle de tema) y Sidebar
│   │   ├── features/                # Módulos del dominio de negocio:
│   │   │   ├── auth/                # LoginPage y AuthModal
│   │   │   ├── users/               # UsersList
│   │   │   ├── stylists/            # StylistsView, comisiones y liquidaciones
│   │   │   ├── inventory/           # InventoryView, servicios y control de stock
│   │   │   ├── sales/               # PosTerminal («Carrito» y cobro gigante) y SalesHistoryView
│   │   │   ├── cash-registers/      # CashRegisterView, arqueo y movimientos
│   │   │   ├── commissions/         # CommissionsView
│   │   │   └── reports/             # ReportsView, KPIs y alertas de stock
│   │   ├── services/                # Capa HTTP con Axios/Fetch y JWT
│   │   │   ├── api.ts               # Cliente base con token interceptor
│   │   │   ├── auth.service.ts
│   │   │   ├── sales.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── stylists.service.ts
│   │   │   ├── cash-register.service.ts
│   │   │   └── reports.service.ts
│   │   ├── hooks/                   # useApp, useCart, useCashRegister, useNotifications
│   │   ├── context/                 # AppContext (tema, sesión, carrito, caja y notificaciones)
│   │   ├── types/                   # Interfaces compartidas (User, Sale, Stylist, Product, etc.)
│   │   ├── utils/                   # formatters.ts (moneda paraguaya y fechas)
│   │   └── styles/                  # globals.css con Tailwind CSS v4
│   ├── public/                      # favicon.svg y recursos estáticos
│   ├── .env.example                 # Variables públicas del cliente (VITE_API_URL)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
│
├── backend/                         # Node.js + Express + TypeScript + SQLite
│   ├── data/                        # Archivo de base de datos persistente (elite_pos.db) y backups
│   ├── src/
│   │   ├── config/                  # env.ts (validación de variables de entorno)
│   │   ├── db/
│   │   │   ├── database.ts          # Conexión nativa node:sqlite, migraciones, seed y backups
│   │   │   ├── schema.sql           # Esquema SQLite
│   │   │   └── migrations/          # 001_initial_schema.sql
│   │   ├── middleware/              # auth.ts (JWT), roles.ts (RBAC), validate.ts (Zod), errorHandler.ts
│   │   ├── modules/                 # Módulos desacoplados del dominio:
│   │   │   ├── auth/                # Login y verificación de identidad
│   │   │   ├── users/               # CRUD de usuarios y roles
│   │   │   ├── stylists/            # Gestión de estilistas/barberos y porcentajes
│   │   │   ├── inventory/           # Servicios, productos retail y stock
│   │   │   ├── sales/               # Transacciones atómicas de venta y comisiones
│   │   │   ├── cash-registers/      # Apertura de turno, arqueo y movimientos
│   │   │   ├── commissions/         # Liquidación y pagos
│   │   │   ├── reports/             # Métricas financieras y alertas de stock
│   │   │   └── system/              # Endpoints de copias de seguridad y restauración
│   │   ├── utils/                   # response.util.ts, logger.util.ts
│   │   ├── routes.ts                # Enrutador central (/api/v1)
│   │   ├── app.ts                   # Express, CORS y middlewares globales
│   │   └── server.ts                # Bootstrap del servidor y graceful shutdown
│   ├── .env.example                 # Configuración de variables (PORT, DATABASE_PATH, JWT_SECRET)
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                     # Monorepo con npm workspaces (frontend y backend)
├── .gitignore
└── README.md
```

---

## ⚡ Comandos de Ejecución

Desde la raíz del proyecto:

### 1. Instalar dependencias de ambos proyectos
```bash
npm install
```

### 2. Iniciar en modo desarrollo
```bash
# Iniciar ambos servicios en paralelo (Frontend + Backend)
npm run dev

# Iniciar únicamente el frontend (Vite en http://localhost:5173)
npm run dev:frontend

# Iniciar únicamente el backend (Express en http://localhost:4000)
npm run dev:backend
```

### 3. Compilar para producción
```bash
# Compilar ambos proyectos
npm run build

# Compilar frontend
npm run build:frontend

# Compilar backend
npm run build:backend
```

---

## 🔑 Usuarios y Credenciales de Prueba

El sistema inicializa automáticamente los siguientes usuarios en SQLite con hash `bcrypt`:

| Rol | Correo Electrónico | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@elitestudio.com` | `admin123` | Acceso total: Configuración, Usuarios, Catálogo, Estilistas, Caja y Reportes |
| **Cajero** | `caja@elitestudio.com` | `caja123` | Operaciones de Cobro, Terminal POS, Turno de Caja e Historial |

*(En la pantalla de inicio de sesión se proporcionan botones de acceso rápido para probar cualquiera de los perfiles con un solo clic).*

---

## 💾 Copias de Seguridad y Restauración de SQLite

El backend incluye funciones automáticas y endpoints dedicados para salvaguardar la base de datos:

- **Crear Copia de Seguridad**: `POST /api/v1/system/backup`
- **Listar Copias Disponibles**: `GET /api/v1/system/backups`
- **Restaurar Copia**: `POST /api/v1/system/restore` (enviando `{ "fileName": "elite_pos_backup_xxxx.db" }`)

Los respaldos se almacenan automáticamente en `backend/data/backups/`.

---

## 📡 Endpoints de la API REST (`/api/v1`)

- `GET /health`: Health check del servidor.
- `POST /auth/login`, `GET /auth/me`: Autenticación con JWT.
- `GET /users`, `POST /users`: Usuarios y roles.
- `GET /stylists`, `POST /stylists`: Estilistas y comisiones.
- `GET /inventory/services`, `POST /inventory/services`: Catálogo de servicios.
- `GET /inventory/products`, `POST /inventory/products`, `PATCH /inventory/products/:id/stock`: Catálogo retail y control de stock.
- `GET /sales`, `POST /sales`: Facturación atómica en transacción SQLite.
- `GET /cash-registers/current`, `POST /cash-registers/open`, `POST /cash-registers/:id/close`, `POST /cash-registers/:id/movements`: Control de gaveta y arqueo.
- `GET /commissions`, `POST /commissions/pay`: Liquidaciones de comisiones.
- `GET /reports/dashboard`: KPIs financieros, ticket promedio y stock crítico.
- `POST /system/backup`, `GET /system/backups`, `POST /system/restore`: Respaldo y restauración.
