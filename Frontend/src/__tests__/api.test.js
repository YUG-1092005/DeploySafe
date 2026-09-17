import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  api,
  loggedIn,
  saveSession,
  signOut
} from '../api.js'

function mockResponse(data, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data)
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()

  global.fetch = vi.fn().mockResolvedValue(
    mockResponse({ success: true, data: {} })
  )
})

describe('DeploySafe API client', () => {
  it('adds JSON headers and authentication token', async () => {
    localStorage.setItem('deploysafe_token', 'test-token')

    await api.dashboard()

    expect(fetch).toHaveBeenCalledTimes(2)

    const [, options] = fetch.mock.calls[0]

    expect(options.headers.Authorization).toBe('Bearer test-token')
    expect(options.headers).toBeDefined()
  })

  it('sends login credentials', async () => {
    await api.login('test@example.com', 'password123')

    const [, options] = fetch.mock.calls[0]

    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({
      email: 'test@example.com',
      password: 'password123'
    })
  })

  it('sends registration data', async () => {
    await api.register('Yug', 'test@example.com', 'password123')

    const [, options] = fetch.mock.calls[0]

    expect(JSON.parse(options.body)).toEqual({
      name: 'Yug',
      email: 'test@example.com',
      password: 'password123'
    })
  })

  it('calls all read endpoints successfully', async () => {
    await api.dashboard()
    await api.projects()
    await api.project(1)
    await api.releases()
    await api.release(1)
    await api.pipeline(1)
    await api.risk(1)
    await api.deployments()
    await api.jenkinsStatus()
    await api.jenkinsRuns()
    await api.jenkinsGate(1)
  })

  it('calls project and release mutation endpoints', async () => {
    await api.createProject({
      name: 'Test Project',
      repo: 'https://github.com/test/repo'
    })

    await api.evaluate(1)
    await api.deploy(1)

    expect(fetch).toHaveBeenCalled()
  })

  it('stores and clears a session', () => {
    const session = {
      token: 'abc123',
      user: {
        id: 1,
        name: 'Yug'
      }
    }

    saveSession(session)

    expect(loggedIn()).toBe(true)
    expect(localStorage.getItem('deploysafe_token')).toBe('abc123')

    signOut()

    expect(loggedIn()).toBe(false)
    expect(localStorage.getItem('deploysafe_token')).toBeNull()
  })

  it('handles unauthorized responses', async () => {
    localStorage.setItem('deploysafe_token', 'expired-token')
    localStorage.setItem(
      'deploysafe_user',
      JSON.stringify({ id: 1, name: 'Yug' })
    )

    const authExpired = vi.fn()
    window.addEventListener('auth-expired', authExpired)

    global.fetch = vi.fn().mockResolvedValue(
      mockResponse({ message: 'Unauthorized' }, 401)
    )

    await expect(api.dashboard()).rejects.toThrow('Unauthorized')

    expect(localStorage.getItem('deploysafe_token')).toBeNull()
    expect(localStorage.getItem('deploysafe_user')).toBeNull()
    expect(authExpired).toHaveBeenCalled()

    window.removeEventListener('auth-expired', authExpired)
  })

  it('handles API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockResponse({ message: 'Server error' }, 500)
    )

    await expect(api.dashboard()).rejects.toThrow('Server error')
  })
})