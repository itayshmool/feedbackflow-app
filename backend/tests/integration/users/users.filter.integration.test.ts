import axios from 'axios'

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000'

async function serverIsUp(): Promise<boolean> {
  try {
    const res = await axios.get(`${BASE_URL}/api/v1/health`, { timeout: 2000 })
    return res.status === 200
  } catch {
    return false
  }
}

describe('Admin Users API - role filtering', () => {
  let running = false

  beforeAll(async () => {
    running = await serverIsUp()
    if (!running) {
      // eslint-disable-next-line no-console
      console.warn('\n[WARN] Backend not running on', BASE_URL, '- skipping Users role filter tests.')
    }
  })

  const itOrSkip = (name: string, fn: jest.ProvidesCallback, timeout?: number) =>
    (running ? it(name, fn, timeout) : it.skip(name, fn, timeout))

  itOrSkip('returns only managers when role=manager', async () => {
    const resp = await axios.get(`${BASE_URL}/api/v1/admin/users`, {
      params: { page: 1, limit: 10, role: 'manager' },
      timeout: 5000,
    })
    expect(resp.status).toBe(200)
    expect(resp.data?.success).toBe(true)
    const users: any[] = resp.data?.data || []
    // TDD: require that every user has manager role
    for (const u of users) {
      const roleNames = Array.isArray(u.roles) ? u.roles.map((r: any) => r.roleName) : []
      expect(roleNames).toContain('manager')
    }
  })

  itOrSkip('returns only managers when filtering by roleId (manager UUID)', async () => {
    // Find roleId for manager
    const rolesResp = await axios.get(`${BASE_URL}/api/v1/admin/users`, {
      params: { page: 1, limit: 1 },
      timeout: 5000,
    })
    expect(rolesResp.status).toBe(200)
    // Fetch manager role id from a dedicated endpoint if exists in future; for now read from DB-less path
    // As a fallback, test with roleId known to exist in seed data through environment variable
    const managerRoleId = process.env.MANAGER_ROLE_ID
    if (!managerRoleId) {
      // Skip gracefully if we cannot resolve manager role id
      // eslint-disable-next-line no-console
      console.warn('[WARN] MANAGER_ROLE_ID not set. Skipping roleId filter test.')
      return
    }

    const resp = await axios.get(`${BASE_URL}/api/v1/admin/users`, {
      params: { page: 1, limit: 10, roleId: managerRoleId },
      timeout: 5000,
    })
    expect(resp.status).toBe(200)
    expect(resp.data?.success).toBe(true)
    const users: any[] = resp.data?.data || []
    for (const u of users) {
      const roleNames = Array.isArray(u.roles) ? u.roles.map((r: any) => r.roleName) : []
      expect(roleNames).toContain('manager')
    }
  })
})


