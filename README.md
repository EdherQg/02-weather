## Weather CLI APP

Aplicación de consola para consultar el clima actual y el pronóstico de tus ciudades con Bun y Open-Meteo. Guarda tus ciudades, una ciudad por defecto y la unidad de temperatura. También se puede compilar como binario ejecutable.

### Opciones:

- Ingresar el nombre de una ciudad.
- Guardar la ciudad por defecto.
- Registrar varias otras ciudades para buscar el clima en esas otras ciudades.
- Consultar el pronóstico de los próximos siete días, desde mañana.

## Stack

- Bun.js
- OpenMeteo

## Estructura del proyecto

```text
src/
├── actions/         # Clima, pronóstico, ciudades y ajustes
├── presentation/    # Menú, entrada, salida y terminal
├── storage/         # Ciudades y preferencias sobre un único config.json
├── types/           # Tipos y contratos compartidos
├── api/             # Geocoding, clima y cliente HTTP compartido
├── utils/           # Formatos, constantes, colores y validaciones
└── index.ts         # Punto de entrada y conexión de dependencias

test/                # Un archivo .test.ts por cada archivo .ts de src/
├── actions/         # Pruebas directas de las siete acciones
├── presentation/    # Entrada, menú, salida y terminal
├── storage/         # Ciudades, ajustes y configuración persistente
├── types/           # Contratos de tipos comprobados por TypeScript
├── api/             # Cliente, geocoding, HTTP y clima/pronóstico
├── utils/           # Colores, formatos, constantes y validaciones
├── index.test.ts    # Arranque, correspondencia de archivos y bloqueo de compilación
├── fixtures.ts      # Datos de prueba compartidos
└── helpers.ts       # Auxiliares compartidos
```

`presentation/menu.ts` coordina las acciones sin implementar su lógica. Las acciones utilizan los contratos de `types/`, lo que permite simular la API, la consola y la persistencia en las pruebas. `actions/listCities.ts` conserva la opción de mostrar todas las ciudades con su clima actual.

`storage/citiesStorage.ts` y `storage/settingsStorage.ts` comparten estado y delegan las escrituras a `storage/configStore.ts`. Se mantiene el formato y la ruta de los datos existentes, con escrituras atómicas y actualización del estado en memoria solo después de guardar correctamente.

## Ejemplo de petición http:

1. Paso 1: Geocoding API.
2. Paso 2: OpenMeteo API.

```
https://geocoding-api.open-meteo.com/v1/search?name=Ottawa&count=1&language=es&format=json
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m
```

## Ejecutar

Necesitas [Bun](https://bun.sh). No necesitas una API key. Las búsquedas y consultas del clima requieren conexión a Internet.

```bash
bun install
bun start
```

### Ejemplo del menú
Esta es la apariencia que deseamos crear

```bash
════════════════════════════════════════
         WEATHER CLI
════════════════════════════════════════
  1. Clima de ciudad default
  2. Clima de todas las ciudades (1)
  3. Buscar y agregar ciudad
  4. Eliminar ciudad
  5. Establecer ciudad default
  6. Pronóstico de 7 días
  8. Ajustes (°C)
  9. Salir
════════════════════════════════════════
  Selecciona una opción: 5
```

### Cómo usarlo

- **3. Buscar y agregar ciudad:** escribe un nombre y elige entre las coincidencias, identificadas por región y país. Guarda sus coordenadas y muestra el clima. La primera ciudad se establece como default automáticamente. No se guardan duplicados.
- **1. Clima de ciudad default:** consulta la ciudad seleccionada por defecto.
- **2. Clima de todas las ciudades:** consulta las ciudades guardadas en paralelo. Si una falla, las demás se siguen mostrando.
- **4. Eliminar ciudad:** selecciona una y confirma con `s`. Si eliminas la default, la primera ciudad restante toma su lugar.
- **5. Establecer ciudad default:** selecciona una ciudad guardada.
- **6. Pronóstico de 7 días:** selecciona una ciudad guardada para ver su pronóstico desde mañana y durante siete días, sin incluir hoy. Cada día muestra fecha, condición meteorológica, temperatura mínima y máxima en la unidad configurada. Puedes cancelar con `0`.
- **8. Ajustes:** elige Celsius (`°C`) o Fahrenheit (`°F`). El viento se muestra siempre en km/h.
- **9. Salir:** cierra la aplicación. También puedes usar `Ctrl+C`.

En las selecciones puedes introducir `0` para cancelar. Las opciones sin ciudades guardadas indican cómo agregar la primera.

En una terminal, el menú y las preguntas se muestran en cyan, las temperaturas en amarillo, las confirmaciones en verde y los errores en rojo. Los colores se desactivan al redirigir la salida, en terminales con `TERM=dumb` o si la variable de entorno `NO_COLOR` está definida.

El clima incluye temperatura, sensación térmica, descripción en español, humedad, viento y hora local de actualización:

```text
  Ottawa, Ontario, Canadá [default]
  Parcialmente nublado
  Temperatura: 7,4 °C
  Sensación térmica: 4,7 °C
  Humedad: 74 % | Viento: 7,6 km/h
  Actualizado: 2026-10-28 15:00 (America/Toronto)
  Fuente: Open-Meteo
```

El pronóstico usa el calendario local de la ciudad consultada, no la fecha del equipo donde ejecutas la app. También muestra la zona horaria y la fuente. Consultarlo no cambia tus ciudades ni ajustes.

## Datos guardados

La configuración se guarda como JSON fuera del proyecto, por lo que también funciona al mover el ejecutable:

- **Windows:** `%APPDATA%\weather-cli\config.json`.
- **macOS:** `~/Library/Application Support/weather-cli/config.json`.
- **Linux:** `$XDG_CONFIG_HOME/weather-cli/config.json` o `~/.config/weather-cli/config.json`.

Puedes elegir otro archivo con la variable de entorno `WEATHER_CLI_CONFIG`. Se crea al guardar una ciudad o cambiar los ajustes. Si el archivo está corrupto, la aplicación avisa y no lo sobrescribe: puedes corregirlo o elegir otra ruta.

## APIs utilizadas

1. **Geocoding:** busca hasta cinco coincidencias en español y obtiene el identificador, nombre, región, país, latitud y longitud.
2. **Forecast:** utiliza las coordenadas guardadas para consultar las condiciones actuales o el pronóstico diario en la unidad elegida, con `timezone=auto`.

Ejemplo de la consulta completa del clima:

```text
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto
```

Para el pronóstico se solicitan ocho días y se descarta el primero (hoy en la ciudad), conservando exactamente los siete siguientes. Se validan las fechas consecutivas y los datos de cada día; si la respuesta está incompleta, se informa del error sin mostrar un pronóstico parcial.

```text
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&daily=weather_code,temperature_2m_min,temperature_2m_max&temperature_unit=celsius&timezone=auto&forecast_days=8
```

Las consultas tienen un límite de espera de 10 segundos. Los errores de red o del servicio se muestran sin cerrar el menú.

## Comprobaciones

```bash
bun check
bun run test
bun run test:coverage
```

Todas las pruebas, fixtures y auxiliares están en `test/` y utilizan `bun:test`, sin dependencias adicionales. Cada módulo tiene su archivo correspondiente: por ejemplo, `src/actions/addCity.ts` → `test/actions/addCity.test.ts`. Una prueba en `test/index.test.ts` comprueba esta correspondencia para detectar archivos sin pruebas y pruebas sin módulo correspondiente. Solo `fixtures.ts` y `helpers.ts` se añaden como soporte compartido. Bun descubre las pruebas de todos los subdirectorios automáticamente; `bun test` también permite ejecutarlas directamente.

Las siete acciones tienen pruebas directas de sus resultados, cancelaciones, validaciones y errores, además de conservar las pruebas de integración del menú. Los archivos de `types/` no contienen lógica ejecutable: sus pruebas utilizan `expectTypeOf` para verificar los contratos válidos e inválidos durante `bun check`. Ejecutar solo `bun test` no sustituye esa comprobación de tipos; `bun run build` exige ambas comprobaciones.

Las pruebas cubren las APIs con respuestas simuladas, las validaciones, la persistencia, las rutas de configuración, el menú y la entrada de consola. También verifican que ciudades y ajustes compartan los datos sin sobrescribirse, que los errores de guardado no alteren el estado y que los archivos temporales se limpien. No necesitan conexión a Internet ni modifican tu configuración habitual.

El pronóstico se prueba desde mañana, con cambios de mes y año, fechas y datos incompletos, unidades Celsius/Fahrenheit, colores, cancelaciones y errores. No se han añadido dependencias para esta funcionalidad.

## Generar el ejecutable

```bash
bun run build
```

Este comando comprueba los tipos y ejecuta todas las pruebas antes de compilar. Si cualquiera de esas comprobaciones falla, termina con un código de error sin ejecutar el compilador ni reemplazar el ejecutable existente. Las pruebas verifican este bloqueo en un proyecto temporal con el compilador simulado.

Genera `dist/weather.exe` en Windows o `dist/weather` en macOS/Linux para el sistema donde lo compiles. El ejecutable no requiere Bun instalado, pero sí Internet para consultar Open-Meteo.

En PowerShell:

```powershell
.\dist\weather.exe
```

En macOS/Linux:

```bash
./dist/weather
```
