import { redirect } from 'next/navigation'

/**
 * The homepage was only a gateway to the sign-in screen,
 * so send visitors straight to the login page.
 */
export default function HomePage() {
  redirect('/login')
}
