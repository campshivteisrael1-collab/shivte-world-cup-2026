import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import LogoutButton from './logout-button'
import {
  buildOfficialKnockoutMatches,
  hasFinalScore,
  sortMatches,
} from '../../lib/knockout'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getMatchTitle(match: any) {
  if (match.phase === 'regular') {
    const jornada = match.match_code?.split('-')[0]?.replace('J', '')
    return `Jornada ${jornada} — Fase regular`
  }

  if (match.phase === 'quarterfinal') return 'Cuartos de final'
  if (match.phase === 'semifinal') return 'Semifinal'
  if (match.phase === 'final') return 'Final'

  return match.phase || 'Partido'
}

function isSubmitted(match: any) {
  return match?.status === 'submitted' || hasFinalScore(match)
}

function isLive(match: any) {
  return Boolean(match?.started_at) && !isSubmitted(match)
}

function getTeam(teams: any[], id: number) {
  return teams.find((team) => String(team.id) === String(id)) || null
}

function makePlaceholderTeam(name: string) {
  return {
    id: null,
    name,
    team: name,
    logo_url: null,
  }
}

function getDisplayTeamA(match: any, teams: any[]) {
  return (
    match._team_a_display ||
    getTeam(teams, match.team_a_id) ||
    makePlaceholderTeam(match.team_a_name || 'Equipo')
  )
}

function getDisplayTeamB(match: any, teams: any[]) {
  return (
    match._team_b_display ||
    getTeam(teams, match.team_b_id) ||
    makePlaceholderTeam(match.team_b_name || 'Equipo')
  )
}

function getDisplayScoreA(match: any) {
  if (isSubmitted(match)) return match.score_a ?? 0
  if (match.started_at) return match.live_score_a ?? 0
  return match.score_a ?? '-'
}

function getDisplayScoreB(match: any) {
  if (isSubmitted(match)) return match.score_b ?? 0
  if (match.started_at) return match.live_score_b ?? 0
  return match.score_b ?? '-'
}

function getPhaseBlockReason(match: any, allMatches: any[]) {
  if (match.phase === 'quarterfinal') {
    const pendingRegular = allMatches.some(
      (m) => m.phase === 'regular' && !isSubmitted(m)
    )

    if (pendingRegular) {
      return 'Los cuartos se habilitan cuando termine toda la fase regular.'
    }
  }

  if (match.phase === 'semifinal') {
    const pendingQuarterfinals = allMatches.some(
      (m) => m.phase === 'quarterfinal' && !isSubmitted(m)
    )

    if (pendingQuarterfinals) {
      return 'Las semifinales se habilitan cuando terminen todos los cuartos de final.'
    }
  }

  if (match.phase === 'final') {
    const pendingSemifinals = allMatches.some(
      (m) => m.phase === 'semifinal' && !isSubmitted(m)
    )

    if (pendingSemifinals) {
      return 'La final se habilita cuando terminen todas las semifinales.'
    }
  }

  return null
}

function TeamMini({
  name,
  logo,
}: {
  name: string
  logo?: string | null
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {logo ? (
        <img
          src={logo}
          alt={name}
          style={{
            width: 24,
            height: 24,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : null}
      <span>{name}</span>
    </div>
  )
}

export default async function RefereePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) {
    return <div>No autorizado</div>
  }

  const { data: session } = await supabase
    .from('referee_sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (!session) {
    return <div>Sesión inválida</div>
  }

  const refereeId = session.referee_id

  if (!refereeId) {
    return (
      <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h1>Mis partidos</h1>
        <p style={{ color: 'red' }}>
          Sesión inválida: no se encontró referee_id.
        </p>
        <LogoutButton />
      </main>
    )
  }

  const { data: referee } = await supabase
    .from('referees')
    .select('*')
    .eq('id', refereeId)
    .single()

  const { data: allMatchesRaw } = await supabase
    .from('matches_view')
    .select('*')

  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('*')

  const allMatches = allMatchesRaw || []
  const teams = teamsRaw || []

  const { knockoutMatches } = buildOfficialKnockoutMatches(allMatches, teams)

  const assignedKnockoutMatches = knockoutMatches.filter((match: any) => {
    return String(match.referee_id) === String(refereeId)
  })

  const assignedRegularMatches = allMatches.filter((match: any) => {
    return (
      match.phase === 'regular' &&
      String(match.referee_id) === String(refereeId)
    )
  })

  const matches =
    assignedKnockoutMatches.length > 0
      ? assignedKnockoutMatches.sort(sortMatches)
      : assignedRegularMatches.sort(sortMatches)

  const nextPendingId =
    matches.find((match: any) => !isSubmitted(match))?.id ?? null

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'Arial, sans-serif',
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Mis partidos</h1>
          <p style={{ marginTop: 8, color: '#666' }}>
            {referee?.name || 'Árbitro'}
          </p>
        </div>

        <LogoutButton />
      </div>

      {!matches.length && (
        <div
          style={{
            padding: 16,
            border: '1px solid #ddd',
            borderRadius: 12,
            background: '#fafafa',
          }}
        >
          No tienes partidos asignados.
        </div>
      )}

      {matches.map((match: any) => {
        const submitted = isSubmitted(match)
        const live = isLive(match)
        const isNextPending = nextPendingId === match.id
        const phaseBlockReason = getPhaseBlockReason(match, allMatches)

        const isBlocked =
          !submitted && !live && (!isNextPending || Boolean(phaseBlockReason))

        const blockText =
          phaseBlockReason ||
          'Primero debes capturar la jornada anterior'

        const teamA = getDisplayTeamA(match, teams)
        const teamB = getDisplayTeamB(match, teams)

        const badgeLabel = submitted
          ? 'FINALIZADO'
          : isBlocked
            ? 'BLOQUEADO'
            : live
              ? 'EN JUEGO'
              : 'POR JUGAR'

        const card = (
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
              color: 'black',
              background: submitted
                ? '#f3fff5'
                : live
                  ? '#eff6ff'
                  : isBlocked
                    ? '#f4f4f4'
                    : '#fffdf2',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              opacity: isBlocked ? 0.75 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 18 }}>
                {getMatchTitle(match)}
              </div>

              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: submitted
                    ? '#d9f7df'
                    : live
                      ? '#dbeafe'
                      : isBlocked
                        ? '#e0e0e0'
                        : '#fff2cc',
                  color: submitted
                    ? '#166534'
                    : live
                      ? '#1d4ed8'
                      : '#333',
                }}
              >
                {badgeLabel}
              </div>
            </div>

            <div style={{ marginBottom: 6 }}>
              {match.sport_display || match.sport_name || 'Deporte'}
            </div>

            {match.match_time && (
              <div style={{ marginBottom: 6, fontSize: 14, color: '#666' }}>
                Horario: {match.match_time}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 10,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <TeamMini
                name={teamA.name || teamA.team || 'Equipo'}
                logo={teamA.logo_url}
              />

              <strong style={{ textAlign: 'center' }}>
                {getDisplayScoreA(match)} - {getDisplayScoreB(match)}
              </strong>

              <div style={{ justifySelf: 'end' }}>
                <TeamMini
                  name={teamB.name || teamB.team || 'Equipo'}
                  logo={teamB.logo_url}
                />
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#666' }}>
              {isBlocked ? blockText : 'Toca para ver detalle'}
            </div>
          </div>
        )

        if (isBlocked) {
          return <div key={match.id}>{card}</div>
        }

        return (
          <Link
            key={match.id}
            href={`/referee/${match.id}`}
            style={{ textDecoration: 'none' }}
          >
            {card}
          </Link>
        )
      })}
    </main>
  )
}