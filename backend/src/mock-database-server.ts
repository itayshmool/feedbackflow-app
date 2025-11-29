import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { testConnection, healthCheck } from './config/mock-database.js';
import { DatabaseOrganizationService } from './services/DatabaseOrganizationService.js';
import { query, testConnection as testRealDbConnection } from './config/real-database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

const app = express();
app.use(cors({ origin: 'http://localhost:3006', credentials: true }));
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

// Initialize services
const organizationService = new DatabaseOrganizationService();

// Health endpoints
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/v1/health', async (_req, res) => {
  try {
    const dbHealth = await healthCheck();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mock user database
const mockUsers: Record<string, any> = {
  'itays@wix.com': {
    id: '1',
    email: 'itays@wix.com',
    name: 'Itay Sivan',
    roles: ['admin'],
    organizationId: '1',
    organizationName: 'Wix.com',
    permissions: ['admin:all'],
    isActive: true,
  },
  'efratr@wix.com': {
    id: '2',
    email: 'efratr@wix.com',
    name: 'Efrat Rozenfeld',
    roles: ['manager'],
    organizationId: '1',
    organizationName: 'Wix.com',
    permissions: ['manager:all'],
    isActive: true,
  },
  'tovahc@wix.com': {
    id: '3',
    email: 'tovahc@wix.com',
    name: 'Tovah Cohen',
    roles: ['employee'],
    organizationId: '1',
    organizationName: 'Wix.com',
    permissions: ['employee:all'],
    isActive: true,
  },
};

// Auth endpoints (now using REAL DATABASE)
app.post('/api/v1/auth/login/mock', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required'
    });
  }
  
  try {
    // Query real database for user
    const userResult = await query(
      'SELECT id, email, name, avatar_url, is_active FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }
    
    const user = userResult.rows[0];
    
    // Get user roles and organization (fetch ALL roles, not just one)
    const rolesResult = await query(
      `SELECT DISTINCT r.name as role, o.id as organization_id, o.name as organization_name, r.permissions
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       JOIN organizations o ON ur.organization_id = o.id
       WHERE ur.user_id = $1 AND ur.is_active = true`,
      [user.id]
    );
    
    // Get all unique roles for the user
    const roles = Array.from(new Set(rolesResult.rows.map(r => r.role)));
    const organizationId = rolesResult.rows[0]?.organization_id || null;
    const organizationName = rolesResult.rows[0]?.organization_name || null;
    
    // Merge all permissions from all roles
    const allPermissions = rolesResult.rows.flatMap(r => r.permissions || []);
    const permissions = Array.from(new Set(allPermissions));
    
    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );
    
    const userWithTimestamp = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      organizationId,
      organizationName,
      permissions,
      isActive: user.is_active,
      lastLoginAt: new Date().toISOString()
    };
    
    // Generate JWT token with user ID
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        organizationId: user.organization_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set token as httpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      user: userWithTimestamp,
      token: token,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/auth/me', async (req, res) => {
  // Check for token in cookie (consistent with frontend using withCredentials: true)
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - No token in cookie'
    });
  }
  
  try {
    // Verify and decode JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; organizationId: string };
    const userId = decoded.userId;
    
    // Query real database for user
    const userResult = await query(
      'SELECT id, email, name, avatar_url, is_active, last_login_at FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Get user roles and organization
    const rolesResult = await query(
      `SELECT r.name as role, o.id as organization_id, o.name as organization_name, r.permissions
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       JOIN organizations o ON ur.organization_id = o.id
       WHERE ur.user_id = $1 AND ur.is_active = true
       LIMIT 1`,
      [user.id]
    );
    
    const roles = rolesResult.rows.map(r => r.role);
    const organizationId = rolesResult.rows[0]?.organization_id || null;
    const organizationName = rolesResult.rows[0]?.organization_name || null;
    const permissions = rolesResult.rows[0]?.permissions || [];
    
    const userWithTimestamp = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      organizationId,
      organizationName,
      permissions,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at || new Date().toISOString()
    };
    
    res.json({ data: userWithTimestamp });
  } catch (error) {
    console.error('/auth/me error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  // Clear the auth cookie (JWT is stateless, no server-side cleanup needed)
  res.clearCookie('authToken');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  const mockToken = 'mock-jwt-token-refreshed-' + Date.now();
  
  res.json({
    token: mockToken,
    expiresIn: 3600
  });
});

// ==================
// Notification Endpoints
// ==================

// GET /api/v1/notifications - Get user notifications
// GET /api/v1/notifications - Fetch user notifications
app.get('/api/v1/notifications', async (req, res) => {
  const { userId, userEmail, isRead, type, category, priority, limit = 50, offset = 0 } = req.query;
  
  try {
    // Build WHERE clause
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    // Filter by user (either by userId or userEmail)
    if (userId) {
      queryParams.push(userId);
      whereConditions.push(`un.user_id = $${paramIndex}`);
      paramIndex++;
    } else if (userEmail) {
      queryParams.push(userEmail);
      whereConditions.push(`u.email = $${paramIndex}`);
      paramIndex++;
    }
    
    // Filter by read status
    if (isRead === 'true') {
      whereConditions.push('un.read_at IS NOT NULL');
    } else if (isRead === 'false') {
      whereConditions.push('un.read_at IS NULL');
    }
    
    // Filter by type
    if (type) {
      queryParams.push(String(type));
      whereConditions.push(`un.type = $${paramIndex}`);
      paramIndex++;
    }
    
    // Filter by category
    if (category) {
      queryParams.push(String(category));
      whereConditions.push(`un.category = $${paramIndex}`);
      paramIndex++;
    }
    
    // Filter by priority
    if (priority) {
      queryParams.push(String(priority));
      whereConditions.push(`un.priority = $${paramIndex}`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated notifications
    const notificationsQuery = `
      SELECT 
        un.id,
        un.user_id,
        u.email as user_email,
        un.type,
        un.category,
        un.title,
        un.message,
        un.data,
        un.status,
        un.priority,
        un.scheduled_at,
        un.sent_at,
        un.delivered_at,
        un.read_at,
        un.failed_at,
        un.error_message,
        un.created_at,
        un.updated_at
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereClause}
      ORDER BY un.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), Number(offset));
    const notificationsResult = await query(notificationsQuery, queryParams);
    
    const notifications = notificationsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      type: row.type,
      category: row.category,
      title: row.title,
      message: row.message,
      data: row.data || {},
      status: row.status,
      priority: row.priority,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      failedAt: row.failed_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: (Number(offset) + Number(limit)) < total
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// GET /api/v1/notifications/stats - Get notification statistics
app.get('/api/v1/notifications/stats', async (req, res) => {
  const { userId, userEmail } = req.query;
  
  try {
    // Build WHERE clause for user filter
    let whereCondition = '';
    let queryParams: any[] = [];
    
    if (userId) {
      queryParams.push(userId);
      whereCondition = 'WHERE un.user_id = $1';
    } else if (userEmail) {
      queryParams.push(userEmail);
      whereCondition = 'WHERE u.email = $1';
    }
    
    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE un.read_at IS NULL) as unread,
        COUNT(*) FILTER (WHERE un.read_at IS NOT NULL) as read,
        COUNT(*) FILTER (WHERE un.created_at >= NOW() - INTERVAL '24 hours') as recent_count
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereCondition}
    `;
    const statsResult = await query(statsQuery, queryParams);
    const stats = statsResult.rows[0];
    
    // Get category breakdown
    const categoryQuery = `
      SELECT 
        un.category,
        COUNT(*) as count
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereCondition}
      GROUP BY un.category
    `;
    const categoryResult = await query(categoryQuery, queryParams);
    const byCategory: Record<string, number> = {};
    categoryResult.rows.forEach((row: any) => {
      byCategory[row.category] = parseInt(row.count);
    });
    
    // Get priority breakdown
    const priorityQuery = `
      SELECT 
        un.priority,
        COUNT(*) as count
      FROM user_notifications un
      LEFT JOIN users u ON un.user_id = u.id
      ${whereCondition}
      GROUP BY un.priority
    `;
    const priorityResult = await query(priorityQuery, queryParams);
    const byPriority: Record<string, number> = {};
    priorityResult.rows.forEach((row: any) => {
      byPriority[row.priority] = parseInt(row.count);
    });
    
    // Ensure all priorities are represented
    ['low', 'normal', 'high', 'urgent'].forEach(priority => {
      if (!byPriority[priority]) {
        byPriority[priority] = 0;
      }
    });
    
    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        unread: parseInt(stats.unread),
        read: parseInt(stats.read),
        byCategory,
        byPriority,
        recentCount: parseInt(stats.recent_count)
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
});

// POST /api/v1/notifications/:id/read - Mark notification as read
app.post('/api/v1/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      `UPDATE user_notifications 
       SET read_at = NOW(), status = 'read', updated_at = NOW()
       WHERE id = $1 AND read_at IS NULL
       RETURNING id, read_at`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or already read'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        readAt: result.rows[0].read_at
      }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// POST /api/v1/notifications/read-all - Mark all notifications as read
app.post('/api/v1/notifications/read-all', async (req, res) => {
  const { userId, userEmail } = req.query;
  
  try {
    // Build WHERE clause
    let whereCondition = 'read_at IS NULL';
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (userId) {
      queryParams.push(userId);
      whereCondition += ` AND user_id = $${paramIndex}`;
      paramIndex++;
    } else if (userEmail) {
      // Need to get user_id from email first
      const userResult = await query('SELECT id FROM users WHERE email = $1', [userEmail]);
      if (userResult.rows.length > 0) {
        queryParams.push(userResult.rows[0].id);
        whereCondition += ` AND user_id = $${paramIndex}`;
        paramIndex++;
      }
    }
    
    const result = await query(
      `UPDATE user_notifications 
       SET read_at = NOW(), status = 'read', updated_at = NOW()
       WHERE ${whereCondition}
       RETURNING id`,
      queryParams
    );
    
    res.json({
      success: true,
      data: {
        markedCount: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

// DELETE /api/v1/notifications/:id - Delete notification
app.delete('/api/v1/notifications/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      'DELETE FROM user_notifications WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// ==================
// Profile Endpoints
// ==================

// GET /api/v1/profile - Get current user profile
app.get('/api/v1/profile', (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  try {
    // Verify and decode JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    
    // For now, use mock data - will migrate to real DB in Module 3
    const user = mockUsers[decoded.email] || mockUsers['itays@wix.com']; // Fallback to mock
  
  // Return user profile
  const profile = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4F46E5&color=fff`,
    isActive: user.isActive,
    emailVerified: true,
    lastLoginAt: user.lastLoginAt || new Date().toISOString(),
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: new Date().toISOString(),
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    department: user.department || 'Engineering',
    position: user.position || 'Software Engineer',
    phone: '+1 (555) 123-4567',
    bio: 'Passionate about building great products and helping teams grow.',
    location: 'San Francisco, CA',
    timezone: 'America/Los_Angeles',
    roles: user.roles,
    permissions: user.permissions,
  };
  
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// PUT /api/v1/profile - Update current user profile
app.put('/api/v1/profile', (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  const { name, department, position, phone, bio, location, timezone } = req.body;
  
  try {
    // Verify and decode JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    
    // For now, use mock data - will migrate to real DB in Module 3
    const user = mockUsers[decoded.email] || mockUsers['itays@wix.com']; // Fallback to mock
  
  // Note: Updates are not persisted (using mock data) - will migrate to real DB in Module 3
  
  // Return complete profile with all required fields
  const updatedProfile = {
    id: user.id,
    email: user.email,
    name: name || user.name,
    avatarUrl: user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || user.name)}&background=4F46E5&color=fff`,
    isActive: user.isActive,
    emailVerified: true,
    lastLoginAt: user.lastLoginAt || new Date().toISOString(),
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: new Date().toISOString(),
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    department: department || user.department || 'Engineering',
    position: position || user.position || 'Software Engineer',
    phone: phone || '+1 (555) 123-4567',
    bio: bio || 'Passionate about building great products and helping teams grow.',
    location: location || 'San Francisco, CA',
    timezone: timezone || 'America/Los_Angeles',
    roles: user.roles,
    permissions: user.permissions,
  };
  
    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// POST /api/v1/profile/avatar - Upload avatar
app.post('/api/v1/profile/avatar', (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  // Mock avatar upload - generate a random avatar URL
  const mockAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
  
  res.json({
    success: true,
    data: {
      avatarUrl: mockAvatarUrl
    },
    message: 'Avatar uploaded successfully'
  });
});

// GET /api/v1/profile/stats - Get profile statistics
app.get('/api/v1/profile/stats', (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  // Mock profile statistics
  const stats = {
    totalFeedbackGiven: 12,
    totalFeedbackReceived: 8,
    averageRating: 4.2,
    totalGoals: 5,
    completedGoals: 3,
    activeCycles: 2,
    completedCycles: 4
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// ==================
// Cycles Endpoints
// ==================

// GET /api/v1/cycles - Get cycles list
// GET /api/v1/cycles - List cycles with filters (REAL DATABASE)
app.get('/api/v1/cycles', async (req, res) => {
  const { page = 1, limit = 20, status, organizationId, type, createdBy, dateFrom, dateTo } = req.query;
  
  try {
    // Build WHERE clause
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (organizationId) {
      queryParams.push(organizationId);
      whereConditions.push(`fc.organization_id = $${paramIndex}`);
      paramIndex++;
    }
    
    if (status) {
      queryParams.push(String(status).toLowerCase());
      whereConditions.push(`fc.status = $${paramIndex}`);
      paramIndex++;
    }
    
    if (type) {
      queryParams.push(String(type).toLowerCase());
      whereConditions.push(`fc.type = $${paramIndex}`);
      paramIndex++;
    }
    
    if (createdBy) {
      queryParams.push(createdBy);
      whereConditions.push(`fc.created_by = $${paramIndex}`);
      paramIndex++;
    }
    
    if (dateFrom) {
      queryParams.push(dateFrom);
      whereConditions.push(`fc.start_date >= $${paramIndex}`);
      paramIndex++;
    }
    
    if (dateTo) {
      queryParams.push(dateTo);
      whereConditions.push(`fc.end_date <= $${paramIndex}`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM feedback_cycles fc
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated cycles with participant counts
    const offset = (Number(page) - 1) * Number(limit);
    const cyclesQuery = `
      SELECT 
        fc.id,
        fc.organization_id as "organizationId",
        fc.name,
        fc.description,
        fc.type,
        fc.status,
        fc.start_date as "startDate",
        fc.end_date as "endDate",
        fc.feedback_start_date as "feedbackStartDate",
        fc.feedback_end_date as "feedbackEndDate",
        fc.settings,
        fc.created_by as "createdBy",
        fc.created_at as "createdAt",
        fc.updated_at as "updatedAt",
        COALESCE(cp_count.participant_count, 0) as participants,
        COALESCE(cp_count.completed_count, 0) as completed
      FROM feedback_cycles fc
      LEFT JOIN (
        SELECT 
          cycle_id,
          COUNT(*) as participant_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count
        FROM cycle_participants
        GROUP BY cycle_id
      ) cp_count ON fc.id = cp_count.cycle_id
      ${whereClause}
      ORDER BY fc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    const cyclesResult = await query(cyclesQuery, queryParams);
    
    res.json({
      success: true,
      data: {
        cycles: cyclesResult.rows,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cycles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cycles'
    });
  }
});

// GET /api/v1/cycles/summary - Get cycle summary (REAL DATABASE)
app.get('/api/v1/cycles/summary', async (req, res) => {
  const { organizationId } = req.query;
  
  try {
    let whereClause = '';
    const queryParams: any[] = [];
    
    if (organizationId) {
      queryParams.push(organizationId);
      whereClause = 'WHERE fc.organization_id = $1';
    }
    
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_cycles,
        COUNT(*) FILTER (WHERE fc.status = 'active') as active_cycles,
        COUNT(*) FILTER (WHERE fc.status = 'closed') as completed_cycles,
        COALESCE(SUM(cp.participant_count), 0) as total_participants,
        CASE 
          WHEN COUNT(*) FILTER (WHERE fc.status IN ('active', 'closed')) > 0
          THEN (COUNT(*) FILTER (WHERE fc.status = 'closed')::float / COUNT(*) FILTER (WHERE fc.status IN ('active', 'closed'))::float * 100)
          ELSE 0
        END as completion_rate
      FROM feedback_cycles fc
      LEFT JOIN (
        SELECT cycle_id, COUNT(*) as participant_count
        FROM cycle_participants
        GROUP BY cycle_id
      ) cp ON fc.id = cp.cycle_id
      ${whereClause}
    `;
    
    const result = await query(summaryQuery, queryParams);
    const row = result.rows[0];
    
    res.json({
      totalCycles: parseInt(row.total_cycles),
      activeCycles: parseInt(row.active_cycles),
      completedCycles: parseInt(row.completed_cycles),
      totalParticipants: parseInt(row.total_participants),
      completionRate: parseFloat(row.completion_rate).toFixed(1)
    });
  } catch (error) {
    console.error('Error fetching cycle summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cycle summary'
    });
  }
});

// GET /api/v1/cycles/:id - Get single cycle (REAL DATABASE)
app.get('/api/v1/cycles/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const cycleQuery = `
      SELECT 
        fc.id,
        fc.organization_id as "organizationId",
        fc.name,
        fc.description,
        fc.type,
        fc.status,
        fc.start_date as "startDate",
        fc.end_date as "endDate",
        fc.feedback_start_date as "feedbackStartDate",
        fc.feedback_end_date as "feedbackEndDate",
        fc.settings,
        fc.created_by as "createdBy",
        fc.created_at as "createdAt",
        fc.updated_at as "updatedAt",
        COALESCE(cp_count.participant_count, 0) as participants,
        COALESCE(cp_count.completed_count, 0) as completed
      FROM feedback_cycles fc
      LEFT JOIN (
        SELECT 
          cycle_id,
          COUNT(*) as participant_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count
        FROM cycle_participants
        GROUP BY cycle_id
      ) cp_count ON fc.id = cp_count.cycle_id
      WHERE fc.id = $1
    `;
    
    const result = await query(cycleQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cycle'
    });
  }
});

// POST /api/v1/cycles - Create cycle (REAL DATABASE)
app.post('/api/v1/cycles', async (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;
    
    const {
      name,
      description,
      organizationId,
      startDate,
      endDate,
      type,
      settings
    } = req.body;
    
    // Validate required fields
    if (!name || !organizationId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, organizationId, startDate, endDate'
      });
    }
    
    const insertQuery = `
      INSERT INTO feedback_cycles (
        organization_id, name, description, type, start_date, end_date,
        settings, created_by, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING 
        id,
        organization_id as "organizationId",
        name,
        description,
        type,
        status,
        start_date as "startDate",
        end_date as "endDate",
        feedback_start_date as "feedbackStartDate",
        feedback_end_date as "feedbackEndDate",
        settings,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await query(insertQuery, [
      organizationId,
      name,
      description || null,
      type || 'quarterly',
      startDate,
      endDate,
      settings || {},
      userId
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cycle'
    });
  }
});

// PUT /api/v1/cycles/:id - Update cycle (REAL DATABASE)
app.put('/api/v1/cycles/:id', async (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const { id } = req.params;
  const { name, description, startDate, endDate, status, settings } = req.body;
  
  try {
    // Build UPDATE clause dynamically
    const updates: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      queryParams.push(name);
      updates.push(`name = $${paramIndex}`);
      paramIndex++;
    }
    
    if (description !== undefined) {
      queryParams.push(description);
      updates.push(`description = $${paramIndex}`);
      paramIndex++;
    }
    
    if (startDate !== undefined) {
      queryParams.push(startDate);
      updates.push(`start_date = $${paramIndex}`);
      paramIndex++;
    }
    
    if (endDate !== undefined) {
      queryParams.push(endDate);
      updates.push(`end_date = $${paramIndex}`);
      paramIndex++;
    }
    
    if (status !== undefined) {
      queryParams.push(status.toLowerCase());
      updates.push(`status = $${paramIndex}`);
      paramIndex++;
    }
    
    if (settings !== undefined) {
      queryParams.push(JSON.stringify(settings));
      updates.push(`settings = $${paramIndex}`);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    queryParams.push(id);
    
    const updateQuery = `
      UPDATE feedback_cycles
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        organization_id as "organizationId",
        name,
        description,
        type,
        status,
        start_date as "startDate",
        end_date as "endDate",
        feedback_start_date as "feedbackStartDate",
        feedback_end_date as "feedbackEndDate",
        settings,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await query(updateQuery, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cycle'
    });
  }
});

// DELETE /api/v1/cycles/:id - Delete cycle (REAL DATABASE)
app.delete('/api/v1/cycles/:id', async (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const { id } = req.params;
  
  try {
    // Check if cycle exists and has associated data
    const checkQuery = `
      SELECT 
        (SELECT COUNT(*) FROM feedback_requests WHERE cycle_id = $1) as request_count,
        (SELECT COUNT(*) FROM feedback_responses WHERE cycle_id = $1) as response_count
    `;
    
    const checkResult = await query(checkQuery, [id]);
    const { request_count, response_count } = checkResult.rows[0];
    
    if (parseInt(request_count) > 0 || parseInt(response_count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cycle with existing feedback requests or responses',
        data: {
          canDelete: false,
          feedbackCount: parseInt(response_count),
          requestCount: parseInt(request_count),
          reason: 'Cycle has associated feedback data'
        }
      });
    }
    
    // Delete the cycle
    const deleteQuery = `DELETE FROM feedback_cycles WHERE id = $1 RETURNING id`;
    const result = await query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Cycle deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cycle'
    });
  }
});

// GET /api/v1/cycles/:id/can-delete - Check if cycle can be deleted (REAL DATABASE)
app.get('/api/v1/cycles/:id/can-delete', async (req, res) => {
  const { id } = req.params;
  
  try {
    const checkQuery = `
      SELECT 
        (SELECT COUNT(*) FROM feedback_requests WHERE cycle_id = $1) as request_count,
        (SELECT COUNT(*) FROM feedback_responses WHERE cycle_id = $1) as response_count
    `;
    
    const result = await query(checkQuery, [id]);
    const { request_count, response_count } = result.rows[0];
    
    const feedbackCount = parseInt(response_count);
    const requestCount = parseInt(request_count);
    const canDelete = feedbackCount === 0 && requestCount === 0;
    
    res.json({
      canDelete,
      feedbackCount,
      requestCount,
      reason: canDelete ? 'Cycle can be safely deleted' : 'Cycle has associated feedback data'
    });
  } catch (error) {
    console.error('Error checking cycle deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check cycle deletion status'
    });
  }
});

// POST /api/v1/cycles/:id/activate - Activate cycle (REAL DATABASE)
app.post('/api/v1/cycles/:id/activate', async (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const { id } = req.params;
  
  try {
    const updateQuery = `
      UPDATE feedback_cycles
      SET status = 'active', updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        organization_id as "organizationId",
        name,
        description,
        type,
        status,
        start_date as "startDate",
        end_date as "endDate",
        feedback_start_date as "feedbackStartDate",
        feedback_end_date as "feedbackEndDate",
        settings,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await query(updateQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error activating cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate cycle'
    });
  }
});

// POST /api/v1/cycles/:id/close - Close cycle (REAL DATABASE)
app.post('/api/v1/cycles/:id/close', async (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const { id } = req.params;
  
  try {
    const updateQuery = `
      UPDATE feedback_cycles
      SET status = 'closed', updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        organization_id as "organizationId",
        name,
        description,
        type,
        status,
        start_date as "startDate",
        end_date as "endDate",
        feedback_start_date as "feedbackStartDate",
        feedback_end_date as "feedbackEndDate",
        settings,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await query(updateQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error closing cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close cycle'
    });
  }
});

// GET /api/v1/cycles/:id/participants - Get cycle participants (REAL DATABASE)
app.get('/api/v1/cycles/:cycleId/participants', async (req, res) => {
  const { cycleId } = req.params;
  
  try {
    const participantsQuery = `
      SELECT 
        cp.id,
        cp.cycle_id as "cycleId",
        cp.user_id as "userId",
        cp.role,
        cp.assigned_by as "assignedBy",
        cp.assigned_at as "assignedAt",
        cp.status,
        cp.metadata,
        u.name as "userName",
        u.email as "userEmail",
        u.position as "userPosition"
      FROM cycle_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.cycle_id = $1
      ORDER BY cp.assigned_at DESC
    `;
    
    const result = await query(participantsQuery, [cycleId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cycle participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cycle participants'
    });
  }
});

// POST /api/v1/cycles/:id/participants - Add participants (REAL DATABASE)
app.post('/api/v1/cycles/:cycleId/participants', async (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;
    
    const { cycleId } = req.params;
    const { participants } = req.body;
    
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Participants array is required'
      });
    }
    
    // Insert participants
    const insertedParticipants = [];
    
    for (const participant of participants) {
      const insertQuery = `
        INSERT INTO cycle_participants (
          cycle_id, user_id, role, assigned_by, status, metadata
        )
        VALUES ($1, $2, $3, $4, 'active', $5)
        ON CONFLICT (cycle_id, user_id) DO NOTHING
        RETURNING 
          id,
          cycle_id as "cycleId",
          user_id as "userId",
          role,
          assigned_by as "assignedBy",
          assigned_at as "assignedAt",
          status,
          metadata
      `;
      
      const result = await query(insertQuery, [
        cycleId,
        participant.userId,
        participant.role || 'employee',
        userId,
        participant.metadata || {}
      ]);
      
      if (result.rows.length > 0) {
        insertedParticipants.push(result.rows[0]);
      }
    }
    
    res.status(201).json(insertedParticipants);
  } catch (error) {
    console.error('Error adding cycle participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add cycle participants'
    });
  }
});

// DELETE /api/v1/cycles/:cycleId/participants/:participantId - Remove participant (REAL DATABASE)
app.delete('/api/v1/cycles/:cycleId/participants/:participantId', async (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const { cycleId, participantId } = req.params;
  
  try {
    const deleteQuery = `
      DELETE FROM cycle_participants
      WHERE cycle_id = $1 AND id = $2
      RETURNING id
    `;
    
    const result = await query(deleteQuery, [cycleId, participantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Error removing cycle participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove cycle participant'
    });
  }
});

// POST /api/v1/cycles/validate-feedback - Validate feedback permission (REAL DATABASE)
app.post('/api/v1/cycles/validate-feedback', async (req, res) => {
  const { cycleId, fromUserId, toUserId, reviewType } = req.body;
  
  try {
    // Check if both users are participants in the cycle
    const checkQuery = `
      SELECT 
        (SELECT COUNT(*) FROM cycle_participants WHERE cycle_id = $1 AND user_id = $2) as from_participant,
        (SELECT COUNT(*) FROM cycle_participants WHERE cycle_id = $1 AND user_id = $3) as to_participant,
        (SELECT status FROM feedback_cycles WHERE id = $1) as cycle_status
    `;
    
    const result = await query(checkQuery, [cycleId, fromUserId, toUserId]);
    
    if (result.rows.length === 0) {
      return res.json({ valid: false });
    }
    
    const { from_participant, to_participant, cycle_status } = result.rows[0];
    
    // Validate: cycle must be active, both must be participants
    const valid = cycle_status === 'active' && 
                  parseInt(from_participant) > 0 && 
                  parseInt(to_participant) > 0;
    
    res.json({ valid });
  } catch (error) {
    console.error('Error validating feedback permission:', error);
    res.json({ valid: false });
  }
});

// ==================
// Feedback Endpoints
// ==================

// GET /api/v1/feedback - List feedback with filters
// GET /api/v1/feedback - Get feedback list (REAL DATABASE)
app.get('/api/v1/feedback', async (req, res) => {
  const { toUserId, toUserEmail, fromUserId, cycleId, status, page = 1, limit = 20 } = req.query;
  
  try {
    // Build WHERE clause
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    // Filter by recipient (toUserId or toUserEmail)
    // Check if toUserId is actually a UUID (not an email)
    const isUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    if (toUserId && isUUID(toUserId)) {
      queryParams.push(toUserId);
      whereConditions.push(`fr.recipient_id = $${paramIndex}`);
      paramIndex++;
    } else if (toUserEmail) {
      queryParams.push(toUserEmail);
      whereConditions.push(`u_recipient.email = $${paramIndex}`);
      paramIndex++;
    }
    
    // Filter by giver (fromUserId)
    if (fromUserId) {
      queryParams.push(fromUserId);
      whereConditions.push(`fr.giver_id = $${paramIndex}`);
      paramIndex++;
    }
    
    // Filter by cycle
    if (cycleId) {
      queryParams.push(cycleId);
      whereConditions.push(`fr.cycle_id = $${paramIndex}`);
      paramIndex++;
    }
    
    // Filter by status (from feedback_requests)
    if (status) {
      queryParams.push(String(status).toLowerCase());
      whereConditions.push(`LOWER(freq.status) = $${paramIndex}`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM feedback_responses fr
       LEFT JOIN feedback_requests freq ON fr.request_id = freq.id
       LEFT JOIN users u_recipient ON fr.recipient_id = u_recipient.id
       ${whereClause}`,
      queryParams
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated feedback with all details
    const offset = (Number(page) - 1) * Number(limit);
    queryParams.push(Number(limit), offset);
    
    const feedbackResult = await query(
      `SELECT 
         fr.id,
         fr.cycle_id as "cycleId",
         fc.name as "cycleName",
         fr.giver_id as "fromUserId",
         u_giver.name as "fromUserName",
         u_giver.email as "fromUserEmail",
         fr.recipient_id as "toUserId",
         u_recipient.name as "toUserName",
         u_recipient.email as "toUserEmail",
         COALESCE(freq.status, 'submitted') as status,
         fr.rating as "overallRating",
         fr.content,
         fr.is_anonymous as "isAnonymous",
         fr.is_approved as "isApproved",
         fr.created_at as "createdAt",
         fr.updated_at as "updatedAt",
         freq.completed_at as "submittedAt"
       FROM feedback_responses fr
       LEFT JOIN feedback_requests freq ON fr.request_id = freq.id
       LEFT JOIN users u_giver ON fr.giver_id = u_giver.id
       LEFT JOIN users u_recipient ON fr.recipient_id = u_recipient.id
       LEFT JOIN feedback_cycles fc ON fr.cycle_id = fc.id
       ${whereClause}
       ORDER BY fr.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );
    
    const feedback = feedbackResult.rows;
    
    res.json({
      success: true,
      data: feedback,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback'
    });
  }
});

// GET /api/v1/feedback/stats - Get feedback statistics
// GET /api/v1/feedback/stats - Get feedback statistics (REAL DATABASE)
app.get('/api/v1/feedback/stats', async (req, res) => {
  const { userId, userEmail } = req.query;
  
  try {
    // Build WHERE clause for user filter
    let userCondition = '';
    const queryParams: any[] = [];
    
    // Check if userId is actually a UUID (not an email)
    const isUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    if (userId && isUUID(userId)) {
      queryParams.push(userId);
      userCondition = `WHERE (fr.recipient_id = $1 OR fr.giver_id = $1)`;
    } else if (userEmail || (userId && !isUUID(userId))) {
      // Use userEmail, or userId if it's actually an email
      queryParams.push(userEmail || userId);
      userCondition = `WHERE (u_recipient.email = $1 OR u_giver.email = $1)`;
    }
    
    // Get total received and given
    let totalsSql = '';
    let totalsParams: any[] = [];
    
    if (queryParams.length > 0) {
      // User filter is active - count separately for received and given
      const userEmail = queryParams[0];
      totalsSql = `
        SELECT 
          COUNT(DISTINCT CASE WHEN u_recipient.email = $1 THEN fr.id END) as total_received,
          COUNT(DISTINCT CASE WHEN u_giver.email = $1 THEN fr.id END) as total_given,
          AVG(fr.rating) FILTER (WHERE fr.rating IS NOT NULL AND (u_recipient.email = $1 OR u_giver.email = $1)) as avg_rating,
          COUNT(DISTINCT CASE WHEN fr.created_at >= NOW() - INTERVAL '30 days' AND (u_recipient.email = $1 OR u_giver.email = $1) THEN fr.id END) as recent_feedback
        FROM feedback_responses fr
        LEFT JOIN users u_recipient ON fr.recipient_id = u_recipient.id
        LEFT JOIN users u_giver ON fr.giver_id = u_giver.id
      `;
      totalsParams = [userEmail];
    } else {
      // No user filter - get all feedback stats
      totalsSql = `
        SELECT 
          COUNT(*) as total_received,
          COUNT(*) as total_given,
          AVG(fr.rating) FILTER (WHERE fr.rating IS NOT NULL) as avg_rating,
          COUNT(*) FILTER (WHERE fr.created_at >= NOW() - INTERVAL '30 days') as recent_feedback
        FROM feedback_responses fr
      `;
      totalsParams = [];
    }
    
    const totalsResult = await query(totalsSql, totalsParams);
    
    // Get counts by status
    let statusSql = '';
    let statusParams: any[] = [];
    
    if (queryParams.length > 0) {
      // User filter active - use email-based filtering
      const userEmail = queryParams[0];
      statusSql = `
        SELECT 
          freq.status,
          COUNT(*) as count
        FROM feedback_requests freq
        LEFT JOIN users u_recipient ON freq.recipient_id = u_recipient.id
        LEFT JOIN users u_requester ON freq.requester_id = u_requester.id
        WHERE (u_recipient.email = $1 OR u_requester.email = $1)
        GROUP BY freq.status
      `;
      statusParams = [userEmail];
    } else {
      // No filter - get all status counts
      statusSql = `
        SELECT freq.status, COUNT(*) as count
        FROM feedback_requests freq
        GROUP BY freq.status
      `;
      statusParams = [];
    }
    
    const statusResult = await query(statusSql, statusParams);
    
    const totals = totalsResult.rows[0];
    const byStatus: Record<string, number> = {};
    statusResult.rows.forEach((row: any) => {
      byStatus[row.status.toUpperCase()] = parseInt(row.count);
    });
    
    // Count pending and completed from requests
    const pending = byStatus['PENDING'] || 0;
    const completed = byStatus['COMPLETED'] || 0;
    
    const stats = {
      totalReceived: parseInt(totals.total_received) || 0,
      totalGiven: parseInt(totals.total_given) || 0,
      pending,
      completed,
      averageRating: totals.avg_rating ? parseFloat(totals.avg_rating).toFixed(1) : 0,
      recentFeedback: parseInt(totals.recent_feedback) || 0,
      byStatus,
    };
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback statistics'
    });
  }
});

// ==================
// Settings Endpoints
// ==================

// GET /api/v1/settings - Get current user settings
app.get('/api/v1/settings', (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  // Mock user settings
  const mockSettings = {
    id: 'settings-1',
    userId: '1',
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    feedbackNotifications: true,
    cycleNotifications: true,
    reminderNotifications: true,
    weeklyDigest: false,
    // Privacy Settings
    profileVisibility: 'organization',
    showEmail: true,
    showPhone: false,
    allowFeedbackFromAnyone: false,
    // Appearance Settings
    theme: 'light',
    language: 'en',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    // Feedback Settings
    defaultFeedbackVisibility: 'manager',
    requireApprovalBeforeSubmit: true,
    allowAnonymousFeedback: false,
    // Security Settings
    twoFactorEnabled: false,
    sessionTimeout: 30,
    updatedAt: new Date().toISOString(),
  };
  
  res.json({
    success: true,
    data: mockSettings
  });
});

// PUT /api/v1/settings - Update user settings
app.put('/api/v1/settings', (req, res) => {
  const token = req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  const updatedSettings = {
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  
  res.json({
    success: true,
    data: updatedSettings,
    message: 'Settings updated successfully'
  });
});

// ==================
// Admin User Endpoints
// ==================

// GET /api/v1/admin/users - Get users list (REAL DATABASE)
app.get('/api/v1/admin/users', async (req, res) => {
  const { page = 1, limit = 10, search, organizationId, role, status } = req.query;
  
  try {
    // Build the WHERE clause
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    // Search filter (name or email)
    if (search) {
      queryParams.push(`%${search}%`);
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      paramIndex++;
    }
    
    // Organization filter
    if (organizationId) {
      queryParams.push(organizationId);
      whereConditions.push(`u.organization_id = $${paramIndex}`);
      paramIndex++;
    }
    
    // Status filter
    if (status === 'active') {
      whereConditions.push('u.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('u.is_active = false');
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM users u 
       ${whereClause}`,
      queryParams
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated users with roles and organization
    const offset = (Number(page) - 1) * Number(limit);
    queryParams.push(Number(limit), offset);
    
    const usersResult = await query(
      `SELECT 
         u.id, u.email, u.name, u.organization_id, u.is_active, u.email_verified,
         u.last_login_at, u.created_at, u.updated_at, u.department, u.position,
         o.name as organization_name,
         array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ${whereClause}
       GROUP BY u.id, u.email, u.name, u.organization_id, u.is_active, u.email_verified,
                u.last_login_at, u.created_at, u.updated_at, u.department, u.position, o.name
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );
    
    // Filter by role if specified (since role filtering is post-aggregation)
    let users = usersResult.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      organizationId: row.organization_id,
      organizationName: row.organization_name || 'No Organization',
      roles: row.roles || [],
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      department: row.department,
      position: row.position
    }));
    
    if (role) {
      users = users.filter((u: any) => u.roles.includes(role as string));
    }
    
    res.json({
      success: true,
      data: users,
      pagination: {
        total: role ? users.length : total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((role ? users.length : total) / Number(limit)),
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// GET /api/v1/admin/users/stats - Get user statistics (REAL DATABASE)
app.get('/api/v1/admin/users/stats', async (req, res) => {
  try {
    // Get overall user counts
    const userCountsResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
        COUNT(*) FILTER (WHERE email_verified = true) as verified_emails
      FROM users
    `);
    
    // Get counts by role
    const roleCountsResult = await query(`
      SELECT r.name as role_name, COUNT(DISTINCT ur.user_id) as count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.name
    `);
    
    // Get counts by organization
    const orgCountsResult = await query(`
      SELECT organization_id, COUNT(*) as count
      FROM users
      WHERE organization_id IS NOT NULL
      GROUP BY organization_id
    `);
    
    // Get recent signups (last 30 days)
    const recentSignupsResult = await query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    const userCounts = userCountsResult.rows[0];
    
    // Format roles as array
    const usersByRole = roleCountsResult.rows.map((row: any) => ({
      roleName: row.role_name,
      count: parseInt(row.count)
    }));
    
    // Format organizations as array (with org names)
    const orgNamesResult = await query(`
      SELECT id, name FROM organizations
      WHERE id IN (${orgCountsResult.rows.map((row: any) => `'${row.organization_id}'`).join(',')})
    `);
    const orgNameMap = new Map();
    orgNamesResult.rows.forEach((row: any) => {
      orgNameMap.set(row.id, row.name);
    });
    
    const usersByOrganization = orgCountsResult.rows.map((row: any) => ({
      organizationName: orgNameMap.get(row.organization_id) || 'Unknown',
      count: parseInt(row.count)
    }));
    
    // Get users by department (where department is not null)
    const deptCountsResult = await query(`
      SELECT department, COUNT(*) as count
      FROM users
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
    `);
    
    const usersByDepartment = deptCountsResult.rows.map((row: any) => ({
      department: row.department,
      count: parseInt(row.count)
    }));
    
    const stats = {
      totalUsers: parseInt(userCounts.total_users),
      activeUsers: parseInt(userCounts.active_users),
      inactiveUsers: parseInt(userCounts.inactive_users),
      verifiedUsers: parseInt(userCounts.verified_emails),
      unverifiedUsers: parseInt(userCounts.total_users) - parseInt(userCounts.verified_emails),
      recentSignups: parseInt(recentSignupsResult.rows[0].count),
      usersByRole,
      usersByDepartment,
      usersByOrganization
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// ==================
// Admin Hierarchy Endpoints
// ==================

// GET /api/v1/admin/hierarchy - Get organizational hierarchy
app.get('/api/v1/admin/hierarchy', (req, res) => {
  const { organizationId } = req.query;
  
  // Mock hierarchy data
  const mockHierarchy = [
    {
      id: '1',
      employeeId: '1',
      employeeName: 'Itay Sivan',
      employeeEmail: 'itays@wix.com',
      managerId: null,
      managerName: null,
      managerEmail: null,
      organizationId: '1',
      organizationName: 'Wix.com',
      isDirect: true,
      level: 0,
      children: ['2', '3'],
    },
    {
      id: '2',
      employeeId: '2',
      employeeName: 'Efrat Rozenfeld',
      employeeEmail: 'efratr@wix.com',
      managerId: '1',
      managerName: 'Itay Sivan',
      managerEmail: 'itays@wix.com',
      organizationId: '1',
      organizationName: 'Wix.com',
      isDirect: true,
      level: 1,
      children: ['3'],
    },
    {
      id: '3',
      employeeId: '3',
      employeeName: 'Tovah Cohen',
      employeeEmail: 'tovahc@wix.com',
      managerId: '2',
      managerName: 'Efrat Rozenfeld',
      managerEmail: 'efratr@wix.com',
      organizationId: '1',
      organizationName: 'Wix.com',
      isDirect: true,
      level: 2,
      children: [],
    },
  ];
  
  res.json({
    success: true,
    data: mockHierarchy
  });
});

// GET /api/v1/hierarchy/tree/:organizationId - Get organizational hierarchy tree (REAL DATABASE)
app.get('/api/v1/hierarchy/tree/:organizationId', async (req, res) => {
  const { organizationId } = req.params;
  
  try {
    // Get all hierarchy relationships for this organization
    const hierarchyResult = await query(
      `SELECT oh.manager_id, oh.employee_id, oh.level,
              u_emp.name as employee_name, u_emp.email as employee_email,
              u_mgr.name as manager_name, u_mgr.email as manager_email
       FROM organizational_hierarchy oh
       JOIN users u_emp ON oh.employee_id = u_emp.id
       LEFT JOIN users u_mgr ON oh.manager_id = u_mgr.id
       WHERE oh.organization_id = $1 AND oh.is_active = true
       ORDER BY oh.level ASC`,
      [organizationId]
    );
    
    if (hierarchyResult.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    // Build a map of employees to their direct reports
    const employeeMap: Record<string, any> = {};
    const managerIds = new Set<string>();
    
    // First pass: Create all employee nodes
    for (const row of hierarchyResult.rows) {
      if (!employeeMap[row.employee_id]) {
        employeeMap[row.employee_id] = {
          id: row.employee_id,
          employeeId: row.employee_id,
          name: row.employee_name || 'Unknown Employee',
          email: row.employee_email || 'no-email@example.com',
          position: 'Employee', // TODO: Get from users table
          department: 'Unknown', // TODO: Get from users table
          managerId: row.manager_id,
          level: row.level,
          isManager: false, // Will be updated if they have reports
          directReportsCount: 0,
          totalReportsCount: 0,
          directReports: []
        };
      }
      managerIds.add(row.manager_id);
    }
    
    // Second pass: Build the tree and mark managers
    for (const row of hierarchyResult.rows) {
      const employee = employeeMap[row.employee_id];
      const manager = employeeMap[row.manager_id];
      
      if (manager) {
        manager.isManager = true;
        manager.directReports.push(employee);
        manager.directReportsCount++;
      }
    }
    
    // Find the root node (top-level manager with no manager in this org)
    let rootNode = null;
    for (const empId in employeeMap) {
      const emp = employeeMap[empId];
      if (!employeeMap[emp.managerId]) {
        rootNode = emp;
        break;
      }
    }
    
    // Calculate total reports recursively
    function calculateTotalReports(node: any): number {
      let total = node.directReportsCount;
      for (const child of node.directReports) {
        total += calculateTotalReports(child);
      }
      node.totalReportsCount = total;
      return total;
    }
    
    if (rootNode) {
      calculateTotalReports(rootNode);
    }
    
    res.json({
      success: true,
      data: rootNode
    });
  } catch (error) {
    console.error('Error fetching hierarchy tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hierarchy tree'
    });
  }
});

// GET /api/v1/hierarchy/stats/:organizationId - Get hierarchy statistics (REAL DATABASE)
app.get('/api/v1/hierarchy/stats/:organizationId', async (req, res) => {
  const { organizationId } = req.params;
  
  try {
    // Get total employees and managers
    const statsQuery = await query(
      `SELECT 
         COUNT(DISTINCT employee_id) as total_employees,
         COUNT(DISTINCT manager_id) as total_managers,
         MAX(level) as max_depth
       FROM organizational_hierarchy
       WHERE organization_id = $1 AND is_active = true`,
      [organizationId]
    );
    
    // Get direct reports distribution
    const distributionQuery = await query(
      `SELECT manager_id, COUNT(*) as report_count
       FROM organizational_hierarchy
       WHERE organization_id = $1 AND is_active = true AND is_direct_report = true
       GROUP BY manager_id`,
      [organizationId]
    );
    
    // Get top-level managers (those who are managers but not employees in the hierarchy)
    const topLevelQuery = await query(
      `SELECT DISTINCT u.id, u.name, u.email,
              COUNT(oh.employee_id) as direct_reports
       FROM users u
       JOIN organizational_hierarchy oh ON u.id = oh.manager_id
       WHERE oh.organization_id = $1 AND oh.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM organizational_hierarchy oh2
         WHERE oh2.employee_id = u.id AND oh2.organization_id = $1 AND oh2.is_active = true
       )
       GROUP BY u.id, u.name, u.email`,
      [organizationId]
    );
    
    const stats = statsQuery.rows[0];
    const directReportsDistribution: Record<string, number> = {};
    
    // Build distribution map
    for (const row of distributionQuery.rows) {
      const count = parseInt(row.report_count);
      directReportsDistribution[count] = (directReportsDistribution[count] || 0) + 1;
    }
    
    const mockStats = {
      totalEmployees: parseInt(stats.total_employees) || 0,
      totalManagers: parseInt(stats.total_managers) || 0,
      averageTeamSize: stats.total_managers > 0 
        ? Math.round(stats.total_employees / stats.total_managers) 
        : 0,
      maxDepth: parseInt(stats.max_depth) || 0,
      departmentCount: 0, // TODO: Calculate from actual department data
      directReportsDistribution,
      topLevelManagers: topLevelQuery.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        directReports: parseInt(row.direct_reports),
        totalReports: parseInt(row.direct_reports) // TODO: Calculate recursive total
      }))
    };
    
    res.json({
      success: true,
      data: mockStats
    });
  } catch (error) {
    console.error('Error fetching hierarchy stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hierarchy statistics'
    });
  }
});

// GET /api/v1/hierarchy/direct-reports/:managerId - Get direct reports for a manager (REAL DATABASE)
app.get('/api/v1/hierarchy/direct-reports/:managerId', async (req, res) => {
  const { managerId } = req.params;
  
  try {
    // Get direct reports from database
    const reportsResult = await query(
      `SELECT 
         u.id,
         u.id as employee_id,
         u.name,
         u.email,
         u.created_at as hired_date,
         (SELECT COUNT(*) FROM organizational_hierarchy oh2 
          WHERE oh2.manager_id = u.id AND oh2.is_active = true) as direct_reports_count
       FROM organizational_hierarchy oh
       JOIN users u ON oh.employee_id = u.id
       WHERE oh.manager_id = $1 
       AND oh.is_active = true 
       AND oh.is_direct_report = true
       ORDER BY u.name ASC`,
      [managerId]
    );
    
    const mockReports = reportsResult.rows.map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      name: row.name,
      email: row.email,
      position: 'Employee', // TODO: Get from users table if available
      department: 'Unknown', // TODO: Get from users/departments table
      hiredDate: row.hired_date,
      directReportsCount: parseInt(row.direct_reports_count) || 0
    }));
    
    res.json({
      success: true,
      data: {
        items: mockReports,
        total: mockReports.length
      }
    });
  } catch (error) {
    console.error('Error fetching direct reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch direct reports'
    });
  }
});

// ==================
// Templates Endpoints
// ==================

// GET /api/v1/templates - Get feedback templates
// GET /api/v1/templates - Fetch all template documents
app.get('/api/v1/templates', async (req, res) => {
  const { type, isDefault, organizationId } = req.query;
  
  try {
    // Build WHERE clause
    let whereConditions: string[] = ['ftd.is_active = true', 'ftd.archived_at IS NULL'];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (organizationId) {
      queryParams.push(organizationId);
      whereConditions.push(`ftd.organization_id = $${paramIndex}`);
      paramIndex++;
    }
    
    if (type) {
      queryParams.push(String(type).toLowerCase());
      whereConditions.push(`ftd.template_type = $${paramIndex}`);
      paramIndex++;
    }
    
    if (isDefault === 'true') {
      whereConditions.push('ftd.is_default = true');
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const templatesQuery = `
      SELECT 
        ftd.id,
        ftd.name,
        ftd.description,
        ftd.template_type,
        ftd.file_name,
        ftd.file_path,
        ftd.file_size,
        ftd.file_mime_type,
        ftd.file_format,
        ftd.download_count,
        ftd.is_active,
        ftd.is_default,
        ftd.tags,
        ftd.created_by,
        u.name as created_by_name,
        ftd.created_at,
        ftd.updated_at
      FROM feedback_template_documents ftd
      LEFT JOIN users u ON ftd.created_by = u.id
      ${whereClause}
      ORDER BY ftd.is_default DESC, ftd.download_count DESC, ftd.created_at DESC
    `;
    
    const result = await query(templatesQuery, queryParams);
    
    const templates = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      template_type: row.template_type,
      file_name: row.file_name,
      file_path: row.file_path,
      file_size: row.file_size,
      file_mime_type: row.file_mime_type,
      file_format: row.file_format,
      download_count: row.download_count,
      is_active: row.is_active,
      is_default: row.is_default,
      tags: row.tags || [],
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    });
  }
});

// GET /api/v1/templates/:id - Get single template
app.get('/api/v1/templates/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      `SELECT 
        ftd.id,
        ftd.name,
        ftd.description,
        ftd.template_type,
        ftd.file_name,
        ftd.file_path,
        ftd.file_size,
        ftd.file_mime_type,
        ftd.file_format,
        ftd.download_count,
        ftd.is_active,
        ftd.is_default,
        ftd.tags,
        ftd.created_by,
        u.name as created_by_name,
        ftd.created_at,
        ftd.updated_at
      FROM feedback_template_documents ftd
      LEFT JOIN users u ON ftd.created_by = u.id
      WHERE ftd.id = $1 AND ftd.is_active = true AND ftd.archived_at IS NULL`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    const row = result.rows[0];
    const template = {
      id: row.id,
      name: row.name,
      description: row.description,
      template_type: row.template_type,
      file_name: row.file_name,
      file_path: row.file_path,
      file_size: row.file_size,
      file_mime_type: row.file_mime_type,
      file_format: row.file_format,
      download_count: row.download_count,
      is_active: row.is_active,
      is_default: row.is_default,
      tags: row.tags || [],
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template'
    });
  }
});

// POST /api/v1/templates - Create new template (file upload)
app.post('/api/v1/templates', async (req, res) => {
  try {
    // For now, this is a mock implementation since we're not handling file uploads
    // In production, this would use multer or similar for file uploads
    const { name, description, templateType, tags, isDefault, organizationId } = req.body;
    
    // Verify JWT token to get user info
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // For mock, we'll just return success
    // In production, file would be saved and record created in database
    res.status(201).json({
      success: true,
      message: 'Template upload endpoint not fully implemented (file storage required)',
      data: {
        id: 'mock-template-id',
        name,
        description,
        template_type: templateType,
        is_default: isDefault || false
      }
    });
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload template'
    });
  }
});

// DELETE /api/v1/templates/:id - Delete template (soft delete)
app.delete('/api/v1/templates/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verify JWT token
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Soft delete by setting archived_at
    const result = await query(
      `UPDATE feedback_template_documents 
       SET archived_at = NOW(), is_active = false 
       WHERE id = $1 AND archived_at IS NULL
       RETURNING id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or already deleted'
      });
    }
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template'
    });
  }
});

// GET /api/v1/templates/:id/download - Download template (increment counter)
app.get('/api/v1/templates/:id/download', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Increment download count
    const result = await query(
      `UPDATE feedback_template_documents 
       SET download_count = download_count + 1 
       WHERE id = $1 AND is_active = true AND archived_at IS NULL
       RETURNING id, file_path, file_name, file_mime_type`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    const template = result.rows[0];
    
    // In production, this would serve the actual file
    // For now, return a mock response
    res.json({
      success: true,
      message: 'File download endpoint not fully implemented (file storage required)',
      data: {
        id: template.id,
        file_name: template.file_name,
        file_path: template.file_path,
        download_url: `http://localhost:5000${template.file_path}`
      }
    });
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download template'
    });
  }
});

// Test organization endpoint
app.get('/api/v1/admin/organizations/test', (_req, res) => res.json({ 
  message: 'Mock Database-backed Organization API is working',
  timestamp: new Date().toISOString()
}));

// Organization endpoints using database
app.get('/api/v1/admin/organizations', async (req, res) => {
  try {
    const { limit = 10, offset = 0, search, status, subscription_plan, is_active } = req.query;
    
    const filters = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      search: search as string,
      status: status as string,
      subscription_plan: subscription_plan as string,
      is_active: is_active ? is_active === 'true' : undefined
    };

    const result = await organizationService.getOrganizations(filters);
    
    res.json({
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      message: 'Failed to fetch organizations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/admin/organizations/stats', async (req, res) => {
  try {
    const stats = await organizationService.getOrganizationStats();
    
    // Return in API format: { data: { snake_case fields } }
    res.json({
      success: true,
      data: {
        total_organizations: stats.total_organizations,
        active_organizations: stats.active_organizations,
        by_plan: stats.by_plan,
        average_users_per_organization: stats.average_users_per_organization,
        total_departments: stats.total_departments,
        total_teams: stats.total_teams,
        total_users: stats.total_users
      }
    });
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check slug availability
app.get('/api/v1/admin/organizations/check-slug', async (req, res) => {
  try {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({
        message: 'Slug parameter is required'
      });
    }
    
    const isAvailable = await organizationService.checkSlugAvailability(slug as string);
    
    res.json({
      available: isAvailable,
      slug: slug
    });
  } catch (error) {
    console.error('Error checking slug availability:', error);
    res.status(500).json({
      message: 'Failed to check slug availability',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create organization
app.post('/api/v1/admin/organizations', async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      contactEmail,
      subscriptionPlan,
      maxUsers,
      maxCycles,
      storageLimitGb
    } = req.body;
    
    if (!name || !slug || !contactEmail || !subscriptionPlan) {
      return res.status(400).json({
        message: 'Missing required fields: name, slug, contactEmail, subscriptionPlan'
      });
    }
    
    const organizationData = {
      name,
      slug,
      description,
      contact_email: contactEmail,
      subscription_plan: subscriptionPlan,
      max_users: maxUsers || 10,
      max_cycles: maxCycles || 5,
      storage_limit_gb: storageLimitGb || 1
    };
    
    const organization = await organizationService.createOrganization(organizationData);
    
    res.status(201).json({
      success: true,
      data: organization,
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      message: 'Failed to create organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get organization by ID
app.get('/api/v1/admin/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await organizationService.getOrganizationById(id);
    
    if (!organization) {
      return res.status(404).json({
        message: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      message: 'Failed to fetch organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update organization
app.put('/api/v1/admin/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const organization = await organizationService.updateOrganization(id, updateData);
    
    if (!organization) {
      return res.status(404).json({
        message: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      data: organization,
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      message: 'Failed to update organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete organization
app.delete('/api/v1/admin/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await organizationService.deleteOrganization(id);
    
    if (!organization) {
      return res.status(404).json({
        message: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      message: 'Failed to delete organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create department
app.post('/api/v1/admin/organizations/:organizationId/departments', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { name, description, type } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        message: 'Missing required fields: name, type'
      });
    }
    
    // For now, return a mock response since we haven't implemented department service yet
    const newDepartment = {
      id: Date.now().toString(),
      name,
      description: description || '',
      type,
      organizationId,
      parentDepartmentId: null,
      managerId: null,
      budget: null,
      isActive: true,
      settings: {
        allowCrossDepartmentFeedback: false,
        requireManagerApproval: true,
        feedbackFrequency: 30,
        notificationPreferences: {
          email: true,
          inApp: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newDepartment,
      message: 'Department created successfully'
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      message: 'Failed to create department',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create team
app.post('/api/v1/admin/organizations/:organizationId/teams', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { name, description, type, departmentId } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        message: 'Missing required fields: name, type'
      });
    }
    
    // For now, return a mock response since we haven't implemented team service yet
    const newTeam = {
      id: Date.now().toString(),
      name,
      description: description || '',
      type,
      organizationId,
      departmentId: departmentId || null,
      teamLeadId: null,
      isActive: true,
      settings: {
        allowPeerFeedback: true,
        requireTeamLeadApproval: false,
        feedbackFrequency: 30,
        notificationPreferences: {
          email: true,
          inApp: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newTeam,
      message: 'Team created successfully'
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      message: 'Failed to create team',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const startServer = async () => {
  try {
    // Test mock database connection (for organization service)
    const mockDbConnected = await testConnection();
    if (!mockDbConnected) {
      console.error('❌ Failed to connect to mock database. Server will not start.');
      process.exit(1);
    }
    console.log('✅ Mock database connected (for organization stats)');

    // Test REAL database connection (for auth and other modules)
    const realDbConnected = await testRealDbConnection();
    if (!realDbConnected) {
      console.error('❌ Failed to connect to REAL PostgreSQL database. Server will not start.');
      process.exit(1);
    }
    console.log('✅ Real PostgreSQL database connected (for auth, users, feedback, etc.)');

    app.listen(PORT, () => {
      console.log(`🚀 Hybrid Mock/Real Database server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 API health: http://localhost:${PORT}/api/v1/health`);
      console.log(`📝 Test org API: http://localhost:${PORT}/api/v1/admin/organizations/test`);
      console.log(`🗄️  Auth Module: Using REAL PostgreSQL database`);
      console.log(`🗄️  Other Modules: Still using mock data (will migrate incrementally)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
