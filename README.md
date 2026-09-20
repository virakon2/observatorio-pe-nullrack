# Observatorio .PE · Evidencia HTTPS

Segunda forja del desafío **«Escanea la web»** de Nullrack Arena. Convierte una comprobación técnica puntual en evidencia comprensible y priorizable para sitios peruanos.

## Qué aporta esta versión

- Nota **A / B / C / F** explicada, sin confundir HTTPS con seguridad integral.
- Evidencia de redirección HTTP → HTTPS, versión TLS, HSTS y días restantes del certificado.
- Filtros para aislar sitios que requieren atención y búsqueda por nombre o dominio.
- Exportación JSON con hora, alcance y señales observadas.
- Interfaz responsive y accesible, sin dependencias de frontend.

## Ejecutar

Requiere Node.js 20 o posterior y no instala dependencias de terceros.

```bash
npm start
```

Abre `http://127.0.0.1:3000`. Para ejecutar las pruebas:

```bash
npm test
```

## Método

Cada medición realiza dos solicitudes `HEAD /`: una por HTTP y otra por HTTPS. El servidor valida que el host pertenezca al catálogo `.pe`, rechaza direcciones privadas o reservadas y fija la conexión a la dirección IPv4 pública resuelta para evitar rebinding de DNS.

La escala resume lo observado:

- **A:** HTTPS responde, HTTP redirige y HSTS está activo.
- **B:** HTTPS responde, pero falta HSTS o no se verificó la redirección.
- **C:** HTTPS responde y HTTP sigue sirviendo la portada sin redirigir.
- **F:** HTTP respondió, pero HTTPS no pudo verificarse.
- **?:** no hubo evidencia suficiente.

## Alcance responsable

- Solo se observa la ruta raíz `/`; no se siguen enlaces ni redirecciones.
- No se envían formularios, no se inicia sesión y no se buscan vulnerabilidades.
- Una falla puntual no demuestra que todo un sitio carezca de HTTPS.
- Redes, firewalls, certificados y políticas cambian; el informe conserva la hora exacta.
- No se guardan resultados ni datos personales.

## Despliegue

El directorio raíz contiene el frontend estático y `api/check.js` funciona como endpoint serverless en Vercel. `server.js` permite el mismo flujo en local.
