// Función Vercel (Node). Toda la lógica vive en server/ai/ para poder probarla sin Vercel.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { nodeAiHandler } from '../server/ai/nodeAdapter'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await nodeAiHandler(req, res)
}
