import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json() as { imageBase64: string }

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Imagem não fornecida' }, { status: 400 })
    }

    const apiKey = process.env.BTY_LLM_SERVER_API_KEY
    const baseUrl = process.env.BTY_LLM_SERVER_BASE_URL

    if (!apiKey || !baseUrl) {
      return NextResponse.json({ success: false, error: 'Configuração de IA ausente' }, { status: 500 })
    }

    // Clean base64 - remove data URI prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '').replace(/\s/g, '')

    const body = {
      model: 'claude-sonnet-4.6',
      max_tokens: 256,
      stream: false,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              type: 'text',
              text: `Você é um sistema especializado em reconhecimento de placas de veículos brasileiros.

Analise a imagem e extraia a placa do veículo.

Responda APENAS com um JSON válido neste formato exato:
{
  "placa": "ABC1234",
  "confianca": "alta",
  "tipo_placa": "padrao_brasil",
  "observacao": ""
}

Regras:
- "placa": a placa em letras maiúsculas sem espaços ou traços. Padrão antigo: 3 letras + 4 números (ex: ABC1234). Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex: ABC1D23). Se não encontrar placa, coloque "NAO_IDENTIFICADA".
- "confianca": "alta" (placa clara e legível), "media" (parcialmente legível), "baixa" (difícil de ler).
- "tipo_placa": "padrao_brasil", "mercosul", "outro" ou "nenhuma".
- "observacao": nota curta se houver algo relevante, senão string vazia.

Responda SOMENTE com o JSON, sem texto adicional.`,
            },
          ],
        },
      ],
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'x-bty-business': 'ReActUs',
        'x-bty-workspace': 'default',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude error:', errText)
      return NextResponse.json({ success: false, error: 'Erro na IA de leitura' }, { status: 500 })
    }

    const result = await response.json() as { content: Array<{ type: string; text: string }> }
    const textContent = result.content.find(c => c.type === 'text')?.text ?? ''

    // Extract JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: 'Resposta inválida da IA' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      placa: string
      confianca: string
      tipo_placa: string
      observacao: string
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('Erro leitura placa:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
