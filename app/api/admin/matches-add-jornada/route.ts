import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getJornadaNumber(matchCode: string | null) {
  if (!matchCode) return null

  const match = String(matchCode).match(/^J(\d+)/i)
  if (!match) return null

  return Number(match[1])
}

function buildMatchCodeFromSlot(oldMatchCode: string | null, newJornada: number) {
  const fallback = `J${newJornada}`

  if (!oldMatchCode) return fallback

  const match = String(oldMatchCode).match(/^J\d+-(.+?)-\d+$/i)

  if (!match) {
    return String(oldMatchCode).replace(/^J\d+/i, `J${newJornada}`)
  }

  const middleCode = match[1]
  const padded = String(newJornada).padStart(2, '0')

  return `J${newJornada}-${middleCode}-${padded}`
}

function pairKey(a: number, b: number) {
  return [a, b].sort((x, y) => x - y).join('-')
}

function generatePairs(
  teamIds: number[],
  alreadyPlayed: Set<string>,
  targetCount: number
) {
  const usedTeams = new Set<number>()
  const selected: Array<{ team_a_id: number; team_b_id: number }> = []

  const teamGameCount = new Map<number, number>()

  for (const key of alreadyPlayed) {
    const [a, b] = key.split('-').map(Number)
    teamGameCount.set(a, (teamGameCount.get(a) || 0) + 1)
    teamGameCount.set(b, (teamGameCount.get(b) || 0) + 1)
  }

  const candidates: Array<{
    team_a_id: number
    team_b_id: number
    score: number
  }> = []

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const a = teamIds[i]
      const b = teamIds[j]
      const key = pairKey(a, b)

      if (alreadyPlayed.has(key)) continue

      const score = (teamGameCount.get(a) || 0) + (teamGameCount.get(b) || 0)

      candidates.push({
        team_a_id: a,
        team_b_id: b,
        score,
      })
    }
  }

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    if (a.team_a_id !== b.team_a_id) return a.team_a_id - b.team_a_id
    return a.team_b_id - b.team_b_id
  })

  for (const candidate of candidates) {
    if (selected.length >= targetCount) break

    if (usedTeams.has(candidate.team_a_id)) continue
    if (usedTeams.has(candidate.team_b_id)) continue

    selected.push({
      team_a_id: candidate.team_a_id,
      team_b_id: candidate.team_b_id,
    })

    usedTeams.add(candidate.team_a_id)
    usedTeams.add(candidate.team_b_id)
  }

  return selected
}

export async function POST() {
  try {
    const { data: regularMatches, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('phase', 'regular')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!regularMatches || regularMatches.length === 0) {
      return NextResponse.json(
        { error: 'No hay jornadas regulares para usar como base.' },
        { status: 400 }
      )
    }

    const jornadas = regularMatches
      .map((match) => getJornadaNumber(match.match_code))
      .filter((jornada): jornada is number => jornada !== null)

    if (jornadas.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron match_code tipo J1, J2, J3...' },
        { status: 400 }
      )
    }

    const lastJornada = Math.max(...jornadas)
    const newJornada = lastJornada + 1

    const lastJornadaMatches = regularMatches
      .filter((match) => getJornadaNumber(match.match_code) === lastJornada)
      .sort((a, b) =>
        String(a.match_code || '').localeCompare(
          String(b.match_code || ''),
          undefined,
          {
            numeric: true,
            sensitivity: 'base',
          }
        )
      )

    if (lastJornadaMatches.length === 0) {
      return NextResponse.json(
        { error: `No se encontraron partidos de la jornada ${lastJornada}.` },
        { status: 400 }
      )
    }

    const alreadyExists = regularMatches.some(
      (match) => getJornadaNumber(match.match_code) === newJornada
    )

    if (alreadyExists) {
      return NextResponse.json(
        { error: `La jornada ${newJornada} ya existe.` },
        { status: 400 }
      )
    }

    const teamIds = Array.from(
      new Set(
        regularMatches.flatMap((match) => [
          Number(match.team_a_id),
          Number(match.team_b_id),
        ])
      )
    )
      .filter(Boolean)
      .sort((a, b) => a - b)

    const alreadyPlayed = new Set<string>()

    regularMatches.forEach((match) => {
      if (!match.team_a_id || !match.team_b_id) return
      alreadyPlayed.add(pairKey(Number(match.team_a_id), Number(match.team_b_id)))
    })

    const newPairs = generatePairs(
      teamIds,
      alreadyPlayed,
      lastJornadaMatches.length
    )

    if (newPairs.length === 0) {
      return NextResponse.json(
        { error: 'Ya no hay cruces nuevos disponibles para crear otra jornada.' },
        { status: 400 }
      )
    }

    const matchesToInsert = newPairs.map((pair, index) => {
      const slot = lastJornadaMatches[index]

      return {
        match_code: buildMatchCodeFromSlot(slot.match_code, newJornada),
        phase: 'regular',

        team_a_id: pair.team_a_id,
        team_b_id: pair.team_b_id,

        sport_id: slot.sport_id,
        referee_id: slot.referee_id,
        match_time: null,

        status: 'pending',
        started_at: null,
        ended_at: null,

        live_score_a: 0,
        live_score_b: 0,
        score_a: null,
        score_b: null,
        referee_note: null,
      }
    })

    const { error: insertError } = await supabase
      .from('matches')
      .insert(matchesToInsert)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Jornada ${newJornada} creada correctamente con ${matchesToInsert.length} cruces nuevos.`,
      lastJornada,
      newJornada,
      createdMatches: matchesToInsert.length,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno' },
      { status: 500 }
    )
  }
}