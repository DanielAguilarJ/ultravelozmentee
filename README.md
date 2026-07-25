# UltraVelozmente 🚀

Este proyecto es el sitio web de UltraVelozmente, optimizado para alto rendimiento y desplegado con Node.js.

## 📋 Requisitos

- Node.js v18+
- npm v9+

## 🛠️ Instalación y Uso Local

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    El sitio estará visible en `http://localhost:3000`.

3.  **Iniciar en producción:**
    ```bash
    npm start
    ```

## 📂 Estructura del Proyecto

-   **`public/`**: Contiene todos los archivos estáticos (HTML, CSS, JS, Imágenes).
-   **`server.js`**: Servidor Express con compresión Gzip habilitada.
-   **`package.json`**: Configuración del proyecto y dependencias.

## 🚀 Despliegue en Hostinger

1.  Sube este repositorio a GitHub.
2.  En Hostinger, ve a la sección **Node.js**.
3.  Conecta tu repositorio y configura:
    -   **Root Directory:** `./`
    -   **Build Command:** `npm install`
    -   **Start Command:** `npm start`
4.  ¡Listo! Hostinger desplegará automáticamente los cambios.
