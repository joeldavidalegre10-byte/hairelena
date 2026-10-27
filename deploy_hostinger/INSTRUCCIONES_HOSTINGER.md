# 🚀 GUÍA DE DESPLIEGUE EN HOSTINGER - ELITE STUDIO POS

Esta guía explica paso a paso cómo subir tu sistema **Elite Studio POS** a tu hosting de **Hostinger**, conectar la base de datos mediante **phpMyAdmin** y dejar todo funcionando en producción al 100%.

---

## 📦 Contenido del Paquete de Despliegue (`deploy_hostinger.zip`)

El paquete contiene todo el código listo y compilado para producción:
- `dist/` 👉 El servidor Backend optimizado (Express + MySQL + JWT).
- `public/` 👉 El Frontend compilado (Vite + React + Tailwind CSS), servido directamente sin problemas de CORS ni puertos cruzados.
- `package.json` 👉 Lista de dependencias limpias para producción (`mysql2`, `express`, `bcryptjs`, etc.).
- `.env.example` 👉 Plantilla lista para rellenar con las credenciales de tu base de datos.
- `database_hostinger_phpmyadmin.sql` 👉 Script SQL completo y optimizado para importar con 1 solo clic en **phpMyAdmin**.

---

## 📋 PASO 1: Crear la Base de Datos MySQL en Hostinger

1. Ingresa a tu panel de control de Hostinger (**hPanel**): [https://hpanel.hostinger.com](https://hpanel.hostinger.com).
2. En el menú lateral izquierdo, haz clic en **Bases de datos** ➡️ **Bases de datos MySQL**.
3. En la sección **Crear una nueva base de datos MySQL y base de datos de usuario**:
   - **Nombre de la base de datos**: Escribe un nombre, por ejemplo: `elitepos` *(Hostinger le añadirá un prefijo, quedando por ejemplo `u123456789_elitepos`)*.
   - **Nombre de usuario de MySQL**: Escribe un usuario, por ejemplo: `admin` *(quedará como `u123456789_admin`)*.
   - **Contraseña**: Escribe o genera una contraseña segura.
4. **IMPORTANTE**: Anota o copia estos 3 datos (Nombre BD, Usuario y Contraseña).
5. Haz clic en el botón **Crear**.

---

## 🗄️ PASO 2: Subir la Base de Datos a phpMyAdmin

1. En la misma pantalla de Bases de Datos de Hostinger, baja a la sección **Bases de datos MySQL actuales**.
2. Al lado de la base de datos que acabas de crear, haz clic en el botón **Entrar a phpMyAdmin**.
3. Se abrirá phpMyAdmin en una nueva pestaña ya conectado.
4. En la columna de la izquierda, **haz clic sobre el nombre de tu base de datos** (ej: `u123456789_elitepos`) para seleccionarla.
5. En el menú superior de pestañas, haz clic en **Importar** (*Import*).
6. En la opción **Seleccionar archivo** (*Browse* / *Elegir archivo*), selecciona el archivo:
   📁 `database_hostinger_phpmyadmin.sql`
7. Baja hasta el final de la página y haz clic en el botón azul **Importar** o **Continuar** (*Go*).
8. ✅ Listo. phpMyAdmin mostrará un recuadro verde indicando que todas las tablas y datos iniciales (servicios, categorías, artículos de cafetería, estilistas y usuarios administradores) se importaron exitosamente.

---

## 📂 PASO 3: Subir los Archivos de la Aplicación a Hostinger

1. En tu **hPanel** de Hostinger, ve a **Archivos** ➡️ **Administrador de archivos** (*File Manager*).
2. Entra a la carpeta de tu sitio web (usualmente `domains/tudominio.com/public_html` o la carpeta donde configurarás tu aplicación Node.js).
3. Haz clic en el botón **Subir** (*Upload*) en la barra superior.
4. Selecciona y sube el archivo comprimido **`elite_studio_pos_hostinger.zip`**.
5. Una vez subido, haz clic derecho sobre el archivo `.zip` y selecciona **Extraer** (*Extract*).
6. Tras descomprimir, verás dentro:
   - `dist/`
   - `public/`
   - `package.json`
   - `.env.example`

---

## ⚙️ PASO 4: Configurar el Archivo `.env`

1. En el Administrador de Archivos de Hostinger, busca el archivo `.env.example`.
2. Haz clic derecho sobre él y selecciona **Renombrar** (*Rename*) cambiándole el nombre a:
   `.env`
   *(Si el Administrador no muestra archivos ocultos que empiezan con punto, puedes editar `.env.example` y luego guardarlo como `.env`)*.
3. Abre el archivo `.env` para editarlo y coloca los datos que creaste en el **PASO 1**:

```env
PORT=4000
NODE_ENV=production
JWT_SECRET=clave_secreta_elite_studio_2026_hostinger

# Conexión MySQL Hostinger
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_admin
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=u123456789_elitepos
```

> 💡 **Nota sobre DB_HOST**: En Hostinger, como la base de datos MySQL y la aplicación están en el mismo servidor, el valor de `DB_HOST` debe ser `localhost`.

4. Guarda los cambios del archivo.

---

## 🟢 PASO 5: Iniciar la Aplicación Node.js en Hostinger

### Si tu plan de Hostinger tiene sección de Node.js en hPanel:
1. En hPanel, ve a **Avanzado** ➡️ **Node.js**.
2. Haz clic en **Crear aplicación**:
   - **Versión de Node.js**: Selecciona **20.x** (o 18.x / 22.x).
   - **Modo de aplicación**: `Production`
   - **Directorio raíz de la aplicación**: La carpeta donde extrajiste los archivos (ej: `public_html`).
   - **Archivo de inicio de la aplicación** (*Application startup file*): `dist/server.js`
3. En la sección de dependencias, haz clic en el botón **Instalar dependencias NPM** (o ejecuta `npm install --omit=dev` en la terminal SSH).
4. Haz clic en **Iniciar** / **Reiniciar aplicación**.

### Si tienes un Servidor VPS en Hostinger:
Puedes iniciar la aplicación fácilmente mediante SSH y PM2:
```bash
# 1. Entrar a la carpeta del proyecto
cd /ruta/de/tu/proyecto

# 2. Instalar dependencias de producción
npm install --omit=dev

# 3. Iniciar con PM2 para que siempre esté activa en segundo plano
pm2 start dist/server.js --name "elite-studio-pos"
pm2 save
pm2 startup
```

---

## 🔑 PASO 6: Acceso al Sistema

¡Felicidades! Abre tu dominio en tu navegador favorito:
👉 `https://tudominio.com`

El sistema viene preconfigurado con las siguientes credenciales listas para ingresar:

| Rol | Usuario | Contraseña | Acceso |
|---|---|---|---|
| **Administrador** | `admin` | `admin` | Acceso total a Ventas, Métricas, Márgenes, Configuración y Reportes |
| **Caja / Cajero** | `caja` | `caja` | Módulo de Punto de Venta y Control de Caja |

*(Una vez que ingreses, puedes ir al módulo de **Configuración** para cambiar tu contraseña o crear nuevos usuarios administradores o cajeros).*

---

## ❓ Preguntas Frecuentes y Soporte

1. **¿Por qué el frontend y el backend están juntos?**
   Diseñamos la versión de producción para que el backend de Node.js sirva directamente los archivos web desde la carpeta `public/`. Esto **elimina al 100% los errores de CORS**, elimina la necesidad de configurar proxies complejos y permite que todo funcione en una sola URL y en un solo servicio.

2. **¿Cómo hacer copias de seguridad en producción?**
   Ahora que tu base de datos está en Hostinger, puedes entrar a phpMyAdmin en cualquier momento, hacer clic en la pestaña **Exportar** y descargar una copia de seguridad completa en archivo `.sql`, o utilizar las copias de seguridad automáticas diarias de Hostinger hPanel.

3. **¿Cómo verificar los registros del servidor?**
   En hPanel en la sección Node.js puedes ver los registros (*Logs*), o si usas VPS mediante `pm2 logs elite-studio-pos`.
