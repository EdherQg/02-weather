#Revisión Weather CLI 
- [x] Colores: cyan (menú), amarillo (temp), verde/rojo (ok/error); desactivados con NO_COLOR o salida redirigida.
- [ ] AGENTS.md: dice que index.ts es stub, pero la app ya funciona — hay que actualizarlo.
- [ ] Ciudades: geocoding solo trae 1 resultado; nombres ambiguos pueden fallar.
- [ ] Tests: no existen; conviene al menos probar storage y las APIs con mocks.
- [ ] Binario: compila bien; revisar que ./weather guarde datos en ~/.config/weather-cli/.
- [ ] Escalabilidad: ¿qué tan fácil será expandir con nuevas funcionalidades?
- [ ] Carga: ¿hay estado de carga en las tareas asíncronas?
- [x] 7 day forecast: opción 6 para obtener el pronóstico de una ciudad guardada durante 7 días desde mañana, con mínimas, máximas y condiciones meteorológicas.

## CheckList adicional de revisión:
- [ ] ¿Usaron ramas?
- [ ] ¿Usaron pull requests?
- [ ] ¿Que pasa si tras un nuevo feature, se rompió otra cosa?
- [ ] ¿Hicieron el testing?¿Qué probaron?
- [ ] ¿Su modelo instalo dependencias?¿Qué dependencias instalo?¿Están deacuerdo ustedes?
- [ ] ¿Comprenden el código?¿Qué es lo que hace?¿Qué es lo que no hace?
