import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { Button, FormGroup, TextField } from '../ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      const offline = (err as { code?: string }).code === 'auth/network-request-failed'
      setError(offline ? 'No connection. Try again.' : 'Wrong email or password.')
      setBusy(false)
    }
  }

  return (
    <form className="page content" onSubmit={submit}>
      <img className="logo logo-light" src="/logos/wassel-lockup.svg" alt="Wassel" />
      <img className="logo logo-dark" src="/logos/wassel-lockup-white.svg" alt="Wassel" />
      <FormGroup>
        <TextField label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
      </FormGroup>
      {error && <p className="ib-help ib-help-error" role="alert">{error}</p>}
      <Button type="submit" block loading={busy}>Sign in</Button>
    </form>
  )
}
