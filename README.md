# <img src="public/logo.png" width="28" height="28" valign="middle" /> IntelliMark

**IntelliMark** es una extensión de Chrome (Manifest V3) diseñada para transformar cualquier video de YouTube en apuntes de estudio estructurados y eficientes mediante timestamps precisos, exportación profesional y asistencia con Inteligencia Artificial.

---

## ✨ Características Principales

- **Captura con Timestamp Exacto:** Al presionar `Alt + Shift + N` o el botón *"Nueva nota"*, se congela el segundo del video para que tomes notas sin perder el hilo.
- **Pausa Automática Inteligente:** El reproductor de YouTube se pausa al iniciar una nota para no perder detalles, permitiéndote reanudarlo cuando desees.
- **Salto en el Tiempo (Seek):** Haz clic en el botón de tiempo de cualquier nota (ej. `▶ 03:45`) y el video saltará instantáneamente al momento exacto.
- **Asistente de IA (Groq / Llama 3.3):**
  - **Mejorar:** Clarifica ideas y redacta apuntes concisos.
  - **Viñetas:** Estructura notas dispersas en listas de puntos clave.
  - **Ortografía:** Corrección gramatical y sintáctica automática.
- **Exportación Dual Profesional:**
  - **Microsoft Word (.docx):** Documentos elegantes con portada, metadatos y tabla de notas con enlaces clickeables a YouTube.
  - **Markdown (.md):** Formato limpio listo para importar a Obsidian, Notion o tu editor preferido.
- **Diseño Editorial:**
  - Tipografía geométrica **Manrope** empaquetada localmente.
  - **Modo Claro** con fondo cálido editorial (`#FEF8F0`).
  - **Modo Oscuro** de alto contraste en tonos azul noche.
- **100% Privado y Local:** Todos tus apuntes se guardan en tu disco local mediante `chrome.storage.local`.

---

## 🛠️ Instalación en Modo Desarrollador

1. Clona el repositorio:
   ```bash
   git clone https://github.com/bleidys16/IntelliMark.git
   cd IntelliMark
   ```

2. Instala dependencias y compila:
   ```bash
   npm install
   npm run build
   ```

3. Cargar en Chrome:
   - Abre tu navegador y dirígete a `chrome://extensions/`.
   - Activa el **Modo de desarrollador** (esquina superior derecha).
   - Haz clic en **Cargar descomprimida** (*Load unpacked*).
   - Selecciona la carpeta `dist/` generada en el proyecto.
   - Fija el ícono de IntelliMark en tu barra de herramientas.

---

## ⌨️ Atajos de Teclado Globales

| Atajo | Acción |
| :--- | :--- |
| `Alt + Shift + P` | Abrir o cerrar el Side Panel de IntelliMark |
| `Alt + Shift + N` | Pausar video y crear nota rápida en el timestamp actual |
| `Enter` (en editor) | Guardar nota |
| `Shift + Enter` | Salto de línea |
| `Esc` | Cancelar edición |

---

## 🏗️ Stack Tecnológico

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 6 + `@crxjs/vite-plugin`
- **Iconografía:** Lucide React
- **Tipografía:** `@fontsource/manrope`
- **Exportadores:** `docx` & `Blob API`
- **IA Engine:** Groq SDK / REST API (Llama 3.3 70B)
