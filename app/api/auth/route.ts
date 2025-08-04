import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple session management
const SESSION_COOKIE_NAME = 'task-manager-session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate credentials against environment variables
    const validUsername = process.env.AUTH_USERNAME;
    const validPassword = process.env.AUTH_PASSWORD;
    const authSecret = process.env.AUTH_SECRET;

    if (!validUsername || !validPassword || !authSecret) {
      return NextResponse.json(
        { success: false, error: 'Authentication not configured' },
        { status: 500 }
      );
    }

    if (username !== validUsername || password !== validPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session data
    const sessionData = {
      username,
      loginTime: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION
    };

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful'
    });

    // Set secure session cookie
    response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

    // Clear session cookie
    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}