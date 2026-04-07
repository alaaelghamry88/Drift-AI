import OpenAI from 'openai'

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

export const DIGEST_MODEL  = process.env.DIGEST_MODEL  ?? 'google/gemini-flash-1.5'
export const VERDICT_MODEL = process.env.VERDICT_MODEL ?? 'qwen/qwen3-235b-a22b:free'
