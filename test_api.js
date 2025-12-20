// Test API admin/accounts

async function testAdminAccounts() {
  try {
    // Login first
    console.log('Logging in as admin...');
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' })
    });
    const loginData = await loginRes.json();
    console.log('Login response:', loginData);

    if (!loginData.token) {
      console.error('Login failed');
      return;
    }

    // Get accounts
    console.log('Fetching admin accounts...');
    const accountsRes = await fetch('http://localhost:4000/api/admin/accounts?pageSize=100', {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const accountsData = await accountsRes.json();
    console.log('Accounts response:', {
      total: accountsData.total,
      itemsCount: accountsData.items?.length || 0,
      page: accountsData.page,
      pageSize: accountsData.pageSize
    });

    if (accountsData.items) {
      console.log('Sample users:');
      accountsData.items.slice(0, 5).forEach(user => {
        console.log(`- ${user.username} [${user.role}] ${user.fullName}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testAdminAccounts();
