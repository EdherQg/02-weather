## Weather CLI APP

Aplicación de consola para consultar el clima de tus ciudades con Bun y Open-Meteo. Guarda tus ciudades, una ciudad por defecto y la unidad de temperatura. También se puede compilar como binario ejecutable.

### Opciones:

- Ingresar el nombre de una ciudad.
- Guardar la ciudad por defecto.
- Registrar varias otras ciudades para buscar el clima en esas otras ciudades.

## Stack

- Bun.js
- OpenMeteo

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

## Datos guardados

La configuración se guarda como JSON fuera del proyecto, por lo que también funciona al mover el ejecutable:

- **Windows:** `%APPDATA%\weather-cli\config.json`.
- **macOS:** `~/Library/Application Support/weather-cli/config.json`.
- **Linux:** `$XDG_CONFIG_HOME/weather-cli/config.json` o `~/.config/weather-cli/config.json`.

Puedes elegir otro archivo con la variable de entorno `WEATHER_CLI_CONFIG`. Se crea al guardar una ciudad o cambiar los ajustes. Si el archivo está corrupto, la aplicación avisa y no lo sobrescribe: puedes corregirlo o elegir otra ruta.

## APIs utilizadas

1. **Geocoding:** busca hasta cinco coincidencias en español y obtiene el identificador, nombre, región, país, latitud y longitud.
2. **Forecast:** utiliza las coordenadas guardadas para consultar las condiciones actuales en la unidad elegida, con `timezone=auto`.

Ejemplo de la consulta completa del clima:

```text
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto
```

Las consultas tienen un límite de espera de 10 segundos. Los errores de red o del servicio se muestran sin cerrar el menú.

## Comprobaciones

```bash
bun check
bun test
```

Las pruebas cubren las APIs con respuestas simuladas, la persistencia, el menú y la entrada de consola. No necesitan conexión a Internet ni modifican tu configuración habitual.

## Generar el ejecutable

```bash
bun run build
```

Genera `dist/weather.exe` en Windows o `dist/weather` en macOS/Linux para el sistema donde lo compiles. El ejecutable no requiere Bun instalado, pero sí Internet para consultar Open-Meteo.

En PowerShell:

```powershell
.\dist\weather.exe
```

En macOS/Linux:

```bash
./dist/weather
```
