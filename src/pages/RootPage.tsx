import { useSearchParams } from 'react-router-dom'
import HomePage from './HomePage'
import AuthCallbackPage from './AuthCallbackPage'

/**
 * Handles both the home screen and OAuth callbacks redirected to "/".
 * If QF redirects back with ?code=... on the root path, process the auth.
 */
export default function RootPage() {
  const [params] = useSearchParams()
  if (params.get('code')) return <AuthCallbackPage />
  return <HomePage />
}
