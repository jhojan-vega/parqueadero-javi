# SIGP - Parqueadero Javi

Sistema Integral de Gestión de Parqueadero (SIGP).

Proyecto para administrar la operación de un parqueadero universitario, incluyendo:

- Ingreso y salida de carros, motos y bicicletas.
- Control de disponibilidad.
- Cálculo automático de tarifas.
- Gestión de pagos en efectivo y Nequi.
- Apertura y cierre de caja.
- Control de faltantes y sobrantes.
- Auditorías.
- Administración de colaboradores.
- Consulta remota desde computador, tablet o celular.

## Tecnologías

- PostgreSQL - Base de datos
- Node.js + Fastify - Backend
- TypeScript - Lenguaje de desarrollo
- React + TypeScript - Frontend
- PWA - Aplicación Web Progresiva
- Docker - Contenedores y despliegue
- Git / GitHub - Control de versiones

## Estructura inicial

PARQUEADERO-JAVI/
- database/
- backend/
- frontend/

## Estado del proyecto

Base de datos estructurada y sometida a pruebas funcionales y de integridad en PostgreSQL.
Backend y Frontend en desarrollo.

## Operación vigente 24 horas

PARKING CHAVi opera de forma continua. Las Cajas se abren por operador y
turno: T1 (06:00–13:00), T2 (13:00–22:00) y T3 (22:00–06:00).

Carros, Motos y Bicicletas se cobran por una tarifa inicial y fracciones de
tiempo; el modelo operativo vigente no utiliza pernocta ni reinicios por
cambio de turno, medianoche o fecha. Las tarifas y Cajas AM/PM anteriores se
conservan únicamente como historial.
