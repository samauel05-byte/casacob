# Casacob Admin

Panel de administración para: **clientes, cobros, recordatorios de pago automáticos y promociones por correo y WhatsApp**.

Stack: Next.js 14 · Supabase (Postgres + Auth) · Resend (correo) · Twilio (WhatsApp) · Vercel (hosting + cron).

## Puesta en marcha

1. **Base de datos**: en tu proyecto Supabase ejecuta `supabase/migrations/0001_init.sql` (SQL Editor).
   Luego en *Authentication → Providers → Email* desactiva *Allow new users to sign up* y crea tu usuario administrador manualmente.
2. **Variables**: copia `.env.example` a `.env.local` y complétalo.
3. `npm install && npm run dev`.
4. **Deploy**: importa el repo en Vercel y carga las mismas variables. `vercel.json` programa el cron diario (14:00 UTC).

## Qué hace

| Sección | Función |
|---|---|
| Clientes | Alta/baja, etiquetas para segmentar, consentimiento por canal. Puedes también importar CSV desde el Table Editor de Supabase. |
| Cobros | Crea cobros en pesos (DOP) o dólares (USD) con enlace de pago, envía recordatorio manual, marca pagado. |
| Promociones | Envía una campaña por correo, WhatsApp o ambos a todos o a una etiqueta. Variables `{{nombre}} {{empresa}} {{negocio}}`. |
| Historial | Cada mensaje enviado/fallido queda registrado. |
| Cron `/api/cron/reminders` | Marca vencidos y recuerda 3 días antes, 1 día antes, el día de vencimiento y cada 3 días en mora. |

## Notas importantes

- **WhatsApp**: Meta solo permite iniciar conversaciones fuera de la ventana de 24 h con *plantillas aprobadas*. Con el código actual (texto libre) funciona en el sandbox de Twilio o con clientes que te escribieron en las últimas 24 h. Para producción hay que registrar plantillas y enviarlas con `ContentSid`.
- **Consentimiento**: envía promociones solo a quien aceptó recibirlas (campos `opt_in_*`). Añade un enlace/mecanismo de baja antes de mandar masivo.
- Envíos masivos grandes: la acción corre en un solo request (límite de Vercel). Para miles de contactos conviene mover el envío a una cola.
- Los cobros se registran y recuerdan; **el cobro en sí ocurre en el enlace de pago** que pegues (Stripe, PayPal, banco…). No hay integración de pasarela todavía.
