import request from 'supertest';
import { app } from '../../../src/real-database-server';

describe('User Pagination Integration Tests', () => {
  describe('GET /api/v1/admin/users - Pagination Tests', () => {
    it('should return different users for different pages', async () => {
      // Test page 1
      const response1 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.data).toBeDefined();
      expect(response1.body.pagination).toBeDefined();
      expect(response1.body.pagination.page).toBe(1);
      expect(response1.body.pagination.offset).toBe(0);

      const page1Users = response1.body.data;
      expect(page1Users.length).toBeGreaterThan(0);

      // Test page 2
      const response2 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.data).toBeDefined();
      expect(response2.body.pagination).toBeDefined();
      expect(response2.body.pagination.page).toBe(2);
      expect(response2.body.pagination.offset).toBe(10);

      const page2Users = response2.body.data;
      expect(page2Users.length).toBeGreaterThan(0);

      // Test page 3
      const response3 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 3, limit: 10 })
        .expect(200);

      expect(response3.body.success).toBe(true);
      expect(response3.body.data).toBeDefined();
      expect(response3.body.pagination).toBeDefined();
      expect(response3.body.pagination.page).toBe(3);
      expect(response3.body.pagination.offset).toBe(20);

      const page3Users = response3.body.data;
      expect(page3Users.length).toBeGreaterThan(0);

      // Verify that different pages return different users
      if (page1Users.length > 0 && page2Users.length > 0) {
        expect(page1Users[0].id).not.toBe(page2Users[0].id);
      }

      if (page2Users.length > 0 && page3Users.length > 0) {
        expect(page2Users[0].id).not.toBe(page3Users[0].id);
      }

      if (page1Users.length > 0 && page3Users.length > 0) {
        expect(page1Users[0].id).not.toBe(page3Users[0].id);
      }
    });

    it('should calculate correct offset for different page sizes', async () => {
      // Test with limit 5, page 3 (should be offset 10)
      const response1 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 3, limit: 5 })
        .expect(200);

      expect(response1.body.pagination.offset).toBe(10);
      expect(response1.body.pagination.limit).toBe(5);

      // Test with limit 20, page 2 (should be offset 20)
      const response2 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 2, limit: 20 })
        .expect(200);

      expect(response2.body.pagination.offset).toBe(20);
      expect(response2.body.pagination.limit).toBe(20);
    });

    it('should handle edge cases for pagination', async () => {
      // Test page 0 (should default to page 1)
      const response1 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 0, limit: 10 })
        .expect(200);

      expect(response1.body.pagination.page).toBe(1);
      expect(response1.body.pagination.offset).toBe(0);

      // Test negative page (should default to page 1)
      const response2 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: -1, limit: 10 })
        .expect(200);

      expect(response2.body.pagination.page).toBe(1);
      expect(response2.body.pagination.offset).toBe(0);

      // Test very large page number
      const response3 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 100, limit: 10 })
        .expect(200);

      expect(response3.body.pagination.page).toBe(100);
      expect(response3.body.pagination.offset).toBe(990);
    });

    it('should maintain pagination state correctly', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 3, limit: 10 })
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(3);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
      expect(response.body.pagination.total).toBeGreaterThan(0);
      expect(response.body.pagination.totalPages).toBeGreaterThan(0);
      expect(typeof response.body.pagination.hasNext).toBe('boolean');
      expect(typeof response.body.pagination.hasPrev).toBe('boolean');
    });

    it('should handle filters with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ 
          page: 2, 
          limit: 10, 
          search: 'test',
          organizationId: 'org-1',
          role: 'employee'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.offset).toBe(10);
    });

    it('should handle empty results correctly', async () => {
      // Test with a search that should return no results
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ 
          page: 1, 
          limit: 10, 
          search: 'nonexistentuser12345'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
      expect(response.body.pagination.hasMore).toBe(false);
    });

    it('should return consistent pagination metadata', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 1, limit: 10 })
        .expect(200);

      const pagination = response.body.pagination;
      
      // Check that all required pagination fields are present
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('offset');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('hasNext');
      expect(pagination).toHaveProperty('hasPrev');

      // Check that the values are consistent
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
      expect(pagination.offset).toBe(0);
      expect(pagination.total).toBeGreaterThanOrEqual(0);
      expect(pagination.totalPages).toBeGreaterThanOrEqual(0);
      expect(typeof pagination.hasNext).toBe('boolean');
      expect(typeof pagination.hasPrev).toBe('boolean');
    });
  });
});
