import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/claude'
import { workflowAssessmentSystemPrompt } from '@/lib/prompts'
import type { DriftProfile } from '@/types/profile'

export async function POST(req: NextRequest) {
  try {
    const { profile } = await req.json() as { profile: DriftProfile }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: workflowAssessmentSystemPrompt(profile),
      messages: [
        {
          role: 'user',
          content: `Generate a workflow assessment for this developer.

Workflow answers:
${profile.workflowAnswers.map(a => `- ${a.questionId}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`).join('\n')}

Return the JSON assessment object.`
        }
      ]
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No response')
    }

    const jsonMatch = textBlock.text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      textBlock.text.match(/(\{[\s\S]*\})/)
    if (!jsonMatch) throw new Error('No JSON found')

    const assessment = JSON.parse(jsonMatch[1] || jsonMatch[0])
    return NextResponse.json(assessment)
  } catch (error) {
    console.error('Workflow assessment error:', error)
    return NextResponse.json({ error: 'Failed to generate assessment' }, { status: 500 })
  }
}
