import { testConnection, healthCheck } from './config/mock-database.js';
import { DatabaseOrganizationService } from './services/DatabaseOrganizationService.js';

async function performanceTest() {
  console.log('🚀 Starting Database Performance Tests...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection performance...');
    const startConnection = Date.now();
    const connected = await testConnection();
    const connectionTime = Date.now() - startConnection;
    
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log(`✅ Database connection: ${connectionTime}ms\n`);

    // Initialize service
    const organizationService = new DatabaseOrganizationService();

    // Test organization stats performance
    console.log('2. Testing organization stats query performance...');
    const startStats = Date.now();
    const stats = await organizationService.getOrganizationStats();
    const statsTime = Date.now() - startStats;
    console.log(`✅ Organization stats query: ${statsTime}ms`);
    console.log(`   - Total organizations: ${stats.total_organizations}`);
    console.log(`   - Active organizations: ${stats.active_organizations}`);
    console.log('');

    // Test organization list performance
    console.log('3. Testing organization list query performance...');
    const startList = Date.now();
    const organizations = await organizationService.getOrganizations({
      limit: 10,
      offset: 0
    });
    const listTime = Date.now() - startList;
    console.log(`✅ Organization list query: ${listTime}ms`);
    console.log(`   - Organizations returned: ${organizations.data.length}`);
    console.log(`   - Total count: ${organizations.pagination.total}`);
    console.log('');

    // Test slug availability performance
    console.log('4. Testing slug availability check performance...');
    const startSlug = Date.now();
    const isAvailable = await organizationService.checkSlugAvailability('test-slug');
    const slugTime = Date.now() - startSlug;
    console.log(`✅ Slug availability check: ${slugTime}ms`);
    console.log(`   - Slug available: ${isAvailable}`);
    console.log('');

    // Test organization creation performance
    console.log('5. Testing organization creation performance...');
    const startCreate = Date.now();
    let createTime: number;
    try {
      const newOrg = await organizationService.createOrganization({
        name: 'Performance Test Org',
        slug: 'perf-test-org',
        description: 'Organization created during performance test',
        contact_email: 'perf@test.com',
        subscription_plan: 'basic',
        max_users: 10,
        max_cycles: 5,
        storage_limit_gb: 1
      });
      createTime = Date.now() - startCreate;
      console.log(`✅ Organization creation: ${createTime}ms`);
      console.log(`   - Created organization ID: ${newOrg?.id || 'N/A'}`);
      console.log('');
    } catch (error) {
      createTime = Date.now() - startCreate;
      console.log(`⚠️  Organization creation: ${createTime}ms (failed)`);
      console.log(`   - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('');
    }

    // Test concurrent operations
    console.log('6. Testing concurrent operations performance...');
    const startConcurrent = Date.now();
    const concurrentPromises = [
      organizationService.getOrganizationStats(),
      organizationService.getOrganizations({ limit: 5, offset: 0 }),
      organizationService.checkSlugAvailability('concurrent-test-1'),
      organizationService.checkSlugAvailability('concurrent-test-2'),
      organizationService.checkSlugAvailability('concurrent-test-3')
    ];
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentTime = Date.now() - startConcurrent;
    console.log(`✅ Concurrent operations: ${concurrentTime}ms`);
    console.log(`   - Operations completed: ${concurrentResults.length}`);
    console.log('');

    // Performance summary
    console.log('📊 Performance Test Summary:');
    console.log('================================');
    console.log(`Database Connection:     ${connectionTime}ms`);
    console.log(`Organization Stats:      ${statsTime}ms`);
    console.log(`Organization List:       ${listTime}ms`);
    console.log(`Slug Availability:       ${slugTime}ms`);
    console.log(`Organization Creation:   ${createTime}ms`);
    console.log(`Concurrent Operations:   ${concurrentTime}ms`);
    console.log('');
    
    // Performance benchmarks
    const benchmarks = {
      connection: connectionTime < 100 ? '✅ Excellent' : connectionTime < 500 ? '✅ Good' : '⚠️  Slow',
      stats: statsTime < 50 ? '✅ Excellent' : statsTime < 200 ? '✅ Good' : '⚠️  Slow',
      list: listTime < 50 ? '✅ Excellent' : listTime < 200 ? '✅ Good' : '⚠️  Slow',
      slug: slugTime < 30 ? '✅ Excellent' : slugTime < 100 ? '✅ Good' : '⚠️  Slow',
      create: createTime < 100 ? '✅ Excellent' : createTime < 500 ? '✅ Good' : '⚠️  Slow',
      concurrent: concurrentTime < 200 ? '✅ Excellent' : concurrentTime < 1000 ? '✅ Good' : '⚠️  Slow'
    };

    console.log('🎯 Performance Benchmarks:');
    console.log('===========================');
    console.log(`Database Connection:     ${benchmarks.connection}`);
    console.log(`Organization Stats:      ${benchmarks.stats}`);
    console.log(`Organization List:       ${benchmarks.list}`);
    console.log(`Slug Availability:       ${benchmarks.slug}`);
    console.log(`Organization Creation:   ${benchmarks.create}`);
    console.log(`Concurrent Operations:   ${benchmarks.concurrent}`);
    console.log('');

    // Overall assessment
    const allGood = Object.values(benchmarks).every(b => b.includes('✅'));
    if (allGood) {
      console.log('🎉 All performance tests passed! Database layer is performing excellently.');
    } else {
      console.log('⚠️  Some performance tests showed slower than expected results.');
      console.log('   Consider optimizing queries or database configuration.');
    }

    console.log('');
    console.log('🔧 Next Steps for Production:');
    console.log('   1. Set up real PostgreSQL database');
    console.log('   2. Configure connection pooling');
    console.log('   3. Add query caching (Redis)');
    console.log('   4. Implement database monitoring');
    console.log('   5. Set up automated performance testing');

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run the performance test
performanceTest();
