import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Athlete = {
  id: number
  name: string
  results?: AthleteResult[]
}

type AthleteResult = {
  id: number
  discipline: string
  resultValue: number
  points: number
}

type Discipline = {
  id: number
  name: string
  pointsFactor: number
}

type PointsResponse = {
  athleteId: number
  name: string
  totalPoints: number
}

const defaultDisciplines = [
  { name: '100m', pointsFactor: 10 },
  { name: 'Kaugushüpe', pointsFactor: 8 },
  { name: 'Kuulitõuge', pointsFactor: 6 },
  { name: 'Kõrgushüpe', pointsFactor: 7 },
  { name: '400m', pointsFactor: 9 },
]

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Päring ebaõnnestus (${response.status})`)
  }

  return response.json() as Promise<T>
}

function App() {
  const [athleteName, setAthleteName] = useState('')
  const [athleteId, setAthleteId] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [resultValue, setResultValue] = useState('')
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [points, setPoints] = useState<PointsResponse | null>(null)
  const [status, setStatus] = useState('Valmis backendiga suhtlema.')
  const [isLoading, setIsLoading] = useState(false)

  const selectedAthleteId = useMemo(
    () => athlete?.id.toString() || athleteId,
    [athlete?.id, athleteId],
  )

  useEffect(() => {
    void request<Discipline[]>('/api/disciplines')
      .then((data) => {
        setDisciplines(data)
        if (data[0]) {
          setDiscipline(data[0].name)
        }
      })
      .catch(() => {
        setStatus('Spordialasid ei saanud laadida. Lisa need nupust või kontrolli backendit.')
      })

    void request<Athlete[]>('/athletes')
      .then((data) => {
        setAthletes(data)
      })
      .catch(() => {
        setStatus('Sportlaste nimekirja ei saanud laadida. Kontrolli, kas backend töötab.')
      })
  }, [])

  async function seedDisciplines() {
    setIsLoading(true)
    setStatus('Lisan vaikimisi spordialasid...')

    try {
      const created = await Promise.all(
        defaultDisciplines.map((item) =>
          request<Discipline>('/api/disciplines', {
            method: 'POST',
            body: JSON.stringify(item),
          }),
        ),
      )
      setDisciplines(created)
      setDiscipline(created[0]?.name || '')
      setStatus('Spordialad lisatud.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Spordialade lisamine ebaõnnestus.')
    } finally {
      setIsLoading(false)
    }
  }

  async function createAthlete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setStatus('Salvestan sportlast...')

    try {
      const created = await request<Athlete>('/athletes', {
        method: 'POST',
        body: JSON.stringify({ name: athleteName.trim() }),
      })
      setAthlete(created)
      setAthletes((current) => [...current, created])
      setAthleteId(created.id.toString())
      setAthleteName('')
      setPoints(null)
      setStatus(`Sportlane ${created.name} loodud ID-ga ${created.id}.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sportlase loomine ebaõnnestus.')
    } finally {
      setIsLoading(false)
    }
  }

  async function addResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setStatus('Salvestan tulemust...')

    try {
      const numericResult = Number(resultValue.replace(',', '.'))

      if (!Number.isFinite(numericResult)) {
        throw new Error('Sisesta tulemus numbrina.')
      }

      await request<AthleteResult>(`/athletes/${selectedAthleteId}/results`, {
        method: 'POST',
        body: JSON.stringify({
          discipline,
          resultValue: numericResult,
        }),
      })

      const [updatedAthlete, updatedPoints] = await Promise.all([
        request<Athlete>(`/athletes/${selectedAthleteId}`),
        request<PointsResponse>(`/athletes/${selectedAthleteId}/points`),
      ])

      setAthlete(updatedAthlete)
      setAthletes((current) =>
        current.map((item) => (item.id === updatedAthlete.id ? updatedAthlete : item)),
      )
      setPoints(updatedPoints)
      setResultValue('')
      setStatus('Tulemus lisatud.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Tulemuse lisamine ebaõnnestus.')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAthlete() {
    if (!selectedAthleteId) return

    setIsLoading(true)
    setStatus('Laen sportlast...')

    try {
      const [loadedAthlete, loadedPoints] = await Promise.all([
        request<Athlete>(`/athletes/${selectedAthleteId}`),
        request<PointsResponse>(`/athletes/${selectedAthleteId}/points`),
      ])

      setAthlete(loadedAthlete)
      setPoints(loadedPoints)
      setAthleteId(loadedAthlete.id.toString())
      setAthletes((current) => {
        const exists = current.some((item) => item.id === loadedAthlete.id)
        return exists
          ? current.map((item) => (item.id === loadedAthlete.id ? loadedAthlete : item))
          : [...current, loadedAthlete]
      })
      setStatus('Sportlane laetud.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sportlase laadimine ebaõnnestus.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Decathlon</p>
          <h1>Sportlaste tulemused</h1>
        </div>
        <div className="status" aria-live="polite">
          {isLoading ? 'Töötan...' : status}
        </div>
      </header>

      <section className="workspace">
        <form className="panel" onSubmit={createAthlete}>
          <h2>Uus sportlane</h2>
          <label>
            Nimi
            <input
              value={athleteName}
              onChange={(event) => setAthleteName(event.target.value)}
              placeholder="Sportlase nimi"
              autoComplete="name"
              required
            />
          </label>
          <button disabled={isLoading || !athleteName.trim()}>Loo sportlane</button>
        </form>

        <form className="panel" onSubmit={addResult}>
          <h2>Lisa tulemus</h2>
          {athletes.length > 0 && (
            <label>
              Sportlane
              <select
                value={selectedAthleteId}
                onChange={(event) => {
                  setAthleteId(event.target.value)
                  const selected = athletes.find((item) => item.id.toString() === event.target.value)
                  setAthlete(selected || null)
                  setPoints(null)
                }}
              >
                <option value="" disabled>
                  Vali sportlane
                </option>
                {athletes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (ID {item.id})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Sportlase ID
            <div className="inline-control">
              <input
                value={selectedAthleteId}
                onChange={(event) => {
                  setAthleteId(event.target.value)
                  setAthlete(null)
                  setPoints(null)
                }}
                inputMode="numeric"
                placeholder="1"
                required
              />
              <button type="button" onClick={loadAthlete} disabled={isLoading || !selectedAthleteId}>
                Lae
              </button>
            </div>
          </label>
          <label>
            Spordiala
            <select
              value={discipline}
              onChange={(event) => setDiscipline(event.target.value)}
              required
            >
              <option value="" disabled>
                Vali spordiala
              </option>
              {disciplines.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tulemus
            <input
              value={resultValue}
              onChange={(event) => setResultValue(event.target.value)}
              inputMode="decimal"
              placeholder="12.34"
              required
            />
          </label>
          <button disabled={isLoading || !selectedAthleteId || !discipline || !resultValue}>
            Lisa tulemus
          </button>
        </form>

        <section className="panel result-panel">
          <div className="panel-title">
            <h2>Sportlane</h2>
            <button type="button" onClick={seedDisciplines} disabled={isLoading}>
              Lisa spordialad
            </button>
          </div>

          {athlete ? (
            <>
              <div className="athlete-summary">
                <span>{athlete.name}</span>
                <strong>{points?.totalPoints ?? 0} punkti</strong>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Spordiala</th>
                    <th>Tulemus</th>
                    <th>Punktid</th>
                  </tr>
                </thead>
                <tbody>
                  {(athlete.results || []).map((result) => (
                    <tr key={result.id}>
                      <td>{result.discipline}</td>
                      <td>{result.resultValue}</td>
                      <td>{result.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="empty-state">Loo sportlane või lae olemasolev ID järgi.</p>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
