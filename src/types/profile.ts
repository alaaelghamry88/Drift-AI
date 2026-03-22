export interface DriftProfile {
  role: string
  stack: string[]
  currentContext: string
  workflowAnswers: WorkflowAnswer[]
  createdAt: string
  updatedAt: string
}

export interface WorkflowAnswer {
  questionId: string
  answer: string | string[]
}

export type Role =
  | 'Frontend Developer'
  | 'Backend Developer'
  | 'Full-Stack Developer'
  | 'Mobile Developer'
  | 'ML / AI Engineer'
  | 'DevOps / Platform Engineer'
  | 'Engineering Lead'
  | 'Technical Founder'
  | 'Other'

export const TECH_STACK_OPTIONS = [
  'React', 'Next.js', 'Vue', 'Svelte', 'Angular',
  'Node.js', 'Python', 'Go', 'Rust', 'Java', 'Ruby',
  'TypeScript', 'JavaScript',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase',
  'AWS', 'GCP', 'Azure', 'Vercel', 'Railway',
  'Docker', 'Kubernetes',
  'LangChain', 'LangGraph', 'OpenAI', 'Anthropic', 'Hugging Face',
  'GraphQL', 'tRPC', 'REST',
  'React Native', 'Expo', 'Flutter',
] as const
