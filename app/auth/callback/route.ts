import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/my-bookings'

  if (code) {
    const cookieStore = new Map<string, string>() // Temporary store for this request

    // Create a temporary supabase client to exchange the code
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.headers.get('cookie')?.split('; ').find(c => c.startsWith(`${name}=`))?.split('=')[1]
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete(name)
          },
        },
      }
    )
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Create the response object
      const response = NextResponse.redirect(`${origin}${next}`)

      // Apply the cookies that were set during exchangeCodeForSession
      // We need to properly set these on the outgoing response so the browser saves them
      // Note: In Next.js App Router, handling cookies in Route Handlers for auth exchange 
      // often requires a slightly more complex cookie transfer if using the latest @supabase/ssr helpers directly.
      // However, for this specific redirect flow, we essentially need to forward the Set-Cookie headers.
      
      // A simpler, robust way with @supabase/ssr in Route Handlers:
      const supabaseResponse = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                return request.headers.get('cookie')?.split('; ').find(c => c.startsWith(`${name}=`))?.split('=')[1]
              },
              set(name: string, value: string, options: CookieOptions) {
                 response.cookies.set({ name, value, ...options })
              },
              remove(name: string, options: CookieOptions) {
                 response.cookies.set({ name, value: '', ...options })
              },
            },
          }
      )
      
      await supabaseResponse.auth.exchangeCodeForSession(code)
      
      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}