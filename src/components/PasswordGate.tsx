import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface Props {
  storageKey: string
  correctPassword: string
  children: React.ReactNode
  title?: string
}

export default function PasswordGate({ storageKey, correctPassword, children, title }: Props) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(storageKey) === correctPassword
  )
  const [input, setInput] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  function tryUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (input === correctPassword) {
      sessionStorage.setItem(storageKey, correctPassword)
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-gray-950 px-6">
      <form onSubmit={tryUnlock} className="w-full max-w-xs space-y-4">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center">
            <Lock size={26} className="text-violet-400" />
          </div>
          <p className="text-white font-black text-lg">{title ?? 'Área restrita'}</p>
          <p className="text-white/40 text-sm text-center">Digite a senha para continuar</p>
        </div>

        <div className="relative">
          <input
            autoFocus
            type={show ? 'text' : 'password'}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Senha"
            className={`w-full px-4 py-3.5 pr-12 rounded-xl border-2 bg-white/5 text-white text-base font-medium focus:outline-none transition ${
              error ? 'border-red-500 animate-pulse' : 'border-white/10 focus:border-violet-500'
            }`}
          />
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center">Senha incorreta</p>}

        <button type="submit"
          className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-black text-white text-sm">
          Entrar
        </button>
      </form>
    </div>
  )
}
