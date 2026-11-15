// Vercel function (Node). All the logic lives in server/ai/ so it can be tested without Vercel.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { nodeAiHandler } from '../server/ai/nodeAdapter'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await nodeAiHandler(req, res)
}
