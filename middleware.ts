import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Setup the response placeholder
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Create the Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Check the Session
  // We use getUser() to validate the token on the server
  const { data: { user }, error } = await supabase.auth.getUser()

  // --- DEBUGGING LOGS (Check your VS Code Terminal) ---
  if (request.nextUrl.pathname.startsWith('/admin')) {
    console.log("------------------------------------------------")
    console.log(`Middleware accessing: ${request.nextUrl.pathname}`)
    console.log(`User ID found: ${user?.id || 'NONE'}`)
    if (error) console.log(`Auth Error: ${error.message}`)
    
    // Check if a cookie exists at all
    const allCookies = request.cookies.getAll().map(c => c.name)
    console.log("Cookies present:", allCookies)
  }
  // ---------------------------------------------------

  // 4. Protect Admin Routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      console.log("Redirecting to Login: No User Session")
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Query the users table for the role
    const { data: userRecord, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log(`Role found in DB: ${userRecord?.role}`)

    if (!userRecord || userRecord.role !== 'admin') {
      console.log("Redirecting to Home: User is not Admin")
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 5. Protect Owner Routes
  if (request.nextUrl.pathname.startsWith('/owner') && 
      !request.nextUrl.pathname.startsWith('/owner/login') && 
      !request.nextUrl.pathname.startsWith('/owner/signup')) {
    
    if (!user) {
      return NextResponse.redirect(new URL('/owner/login', request.url))
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRecord || (userRecord.role !== 'owner' && userRecord.role !== 'admin')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/owner/:path*',
    '/my-bookings/:path*',
  ],
}