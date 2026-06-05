import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    const base = import.meta.env.VITE_API_URL || '/api/v1'
    const url = base === '/api/v1' ? window.location.origin : base.replace(/\/api\/v1\/?$/, '')
    socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
    })
  }
  return socket
}

export function useProbingStatus() {
  const [active, setActive] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s = getSocket()

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))

    s.on('probing:start', () => setActive(true))
    s.on('probing:result', (data: any) => {
      setActive(false)
      setLastResult(data)
    })

    return () => {
      s.off('connect')
      s.off('disconnect')
      s.off('probing:start')
      s.off('probing:result')
    }
  }, [])

  return { active, connected, lastResult }
}
