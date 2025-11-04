// Debug admin accounts API
import { connectMongo } from './backend/src/db/mongo.js';
import { UserModel } from './backend/src/models/User.js';

async function debugAccounts() {
  try {
    await connectMongo();
    console.log('Connected to MongoDB');

    // Count all users
    const totalUsers = await UserModel.countDocuments();
    console.log('Total users in DB:', totalUsers);

    // Count by role
    const adminCount = await UserModel.countDocuments({ role: 'admin' });
    const teacherCount = await UserModel.countDocuments({ role: 'teacher' });
    const studentCount = await UserModel.countDocuments({ role: 'student' });

    console.log('Admins:', adminCount);
    console.log('Teachers:', teacherCount);
    console.log('Students:', studentCount);

    // Get sample users
    const users = await UserModel.find({}, 'username fullName role status').limit(10).lean();
    console.log('\nSample users:');
    users.forEach(user => {
      console.log(`- ${user.username} [${user.role}] ${user.fullName} (${user.status || 'active'})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugAccounts();
