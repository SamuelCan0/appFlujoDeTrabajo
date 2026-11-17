# AppTareas

Aplicación de escritorio para Windows que organiza el trabajo diario de un taller de impresión 3D. Reúne en una sola ventana las tareas pendientes, lo que se está imprimiendo en cada impresora y las fechas de entrega.

Funciona sin internet y solo guarda lo que sigue en curso: lo terminado se borra y no queda historial.

## Funciones

### Por hacer
- Lista de tareas pendientes. Se añade una escribiéndola y pulsando Enter.
- Para cambiar el nombre de una tarea, haz clic sobre el texto.
- Al terminar una tarea se borra, con 6 segundos para deshacerlo.

### Calendario de entregas
- Calendario mensual donde se apuntan a mano las fechas de entrega, cada una con nombre y uno de 8 colores.
- Cada día muestra un punto por entrega; al pasar el ratón se ven sus nombres.
- Las entregas se pueden editar, y al marcarlas como **Entregado** se borran.

### Flujo de trabajo
- Cada trabajo tiene sus camas de impresión.
- Cada cama se asigna a una impresora (Bambu Lab o K1C) y tiene un estado: Pendiente, Imprimiendo o Lista.
- Una barra muestra el avance, y la cabecera indica cuántas camas están imprimiendo.
- Cuando todas las camas están listas, **Finalizar y borrar** elimina el trabajo.

## Datos

Todo se guarda solo en el equipo, en `%LOCALAPPDATA%\com.samuel.apptareas`. Al cerrar y volver a abrir la app se conserva lo pendiente.

La app no hace conexiones de red: su configuración de seguridad bloquea las conexiones externas.

## Requisitos para compilar

- [Node.js](https://nodejs.org/) 20.19 o superior.
- [Rust](https://www.rust-lang.org/tools/install) con el toolchain `stable-x86_64-pc-windows-msvc`.
- Visual Studio o Build Tools con la carga de trabajo "Desarrollo para el escritorio con C++".
- WebView2, que ya viene con Windows 10 y 11.

## Uso

Instalar las dependencias:

```bash
npm install
```

Abrir la app en modo desarrollo, con recarga automática:

```bash
npm run tauri dev
```

Compilar la versión final:

```bash
npm run tauri build
```

El ejecutable queda en `src-tauri/target/release/app-tareas.exe` y el instalador en `src-tauri/target/release/bundle/nsis/`.

## Tecnología

- [Tauri 2](https://tauri.app/) para la app de escritorio.
- React 19 y TypeScript para la interfaz, con Vite como herramienta de compilación.
- CSS propio, sin librerías de componentes.

## Estructura

| Archivo | Contenido |
| --- | --- |
| `src/App.tsx` | Interfaz principal: tareas, flujos y aviso de deshacer. |
| `src/Calendar.tsx` | Calendario y gestión de entregas. |
| `src/store.ts` | Tipos de datos, acciones y guardado local. |
| `src/App.css` | Estilos. |
| `src-tauri/` | Configuración y código Rust de la app de escritorio. |
