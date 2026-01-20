This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Webhook de liberacion de citas

Se envia un webhook cuando un cliente confirma la eliminacion de una cita o confirma una modificacion de hora. Esto permite enterarte de huecos liberados (para lista de espera u otros flujos).

**Archivos clave**
- `src/app/api/confirm/route.js`: dispara los eventos despues de confirmar la accion.
- `src/app/api/_helpers.js`: helper `notifyWebhook` que ejecuta el POST.

**Configuracion**
1) Define el webhook en tu entorno:
```
N8N_WEBHOOK_URL=https://n8n.srv1168532.hstgr.cloud/webhook/07d653cf-07d2-4fbf-a9b8-cad9c6a2beda
```
Tambien funciona `WEBHOOK_URL` si prefieres otro nombre.
2) Reinicia el servidor de Next.js.

**Eventos**
- `appointment_deleted_confirmed`: cuando el cliente confirma eliminar la cita.
- `appointment_time_change_confirmed`: cuando el cliente confirma una modificacion de hora.

**Payload**
```json
{
  "event": "appointment_deleted_confirmed",
  "timestamp": "2024-10-01T10:00:00.000Z",
  "action": "confirm",
  "confirmation": {
    "id": "uuid-confirmacion",
    "tipo": "eliminar"
  },
  "appointment": {
    "id": "uuid-cita",
    "estado": "pendiente",
    "tiempo_inicio": "2024-10-05T09:00:00.000Z",
    "tiempo_fin": "2024-10-05T09:30:00.000Z",
    "titulo": "Corte",
    "descripcion": null,
    "cliente": { "nombre": "Cliente", "telefono": "600000000" },
    "servicio": { "nombre": "Servicio", "precio": 25 }
  },
  "waitlist_client_ids": ["uuid-cliente-1", "uuid-cliente-2"],
  "waitlist_count": 2
}
```

**Notas**
- El webhook es best-effort: si falla, la confirmacion sigue su curso y se loguea un warning en servidor.
- El evento `appointment_time_change_confirmed` asume que la cita ya fue movida por el sistema y que el horario anterior queda libre.
