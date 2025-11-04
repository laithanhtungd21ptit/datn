import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo } from '../db/mongo.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { AssignmentModel } from '../models/Assignment.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { SubmissionModel } from '../models/Submission.js';

async function checkDatabase() {
  await connectMongo();

  console.log('\n=== Database Status ===\n');

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name).join(', '));

  console.log('\n=== Document Counts ===\n');
  
  const userCount = await UserModel.countDocuments();
  const classCount = await ClassModel.countDocuments();
  const assignmentCount = await AssignmentModel.countDocuments();
  const enrollmentCount = await EnrollmentModel.countDocuments();
  const submissionCount = await SubmissionModel.countDocuments();

  console.log(`Users:       ${userCount}`);
  console.log(`Classes:     ${classCount}`);
  console.log(`Assignments: ${assignmentCount}`);
  console.log(`Enrollments: ${enrollmentCount}`);
  console.log(`Submissions: ${submissionCount}`);

  console.log('\n=== User Breakdown ===\n');
  const adminCount = await UserModel.countDocuments({ role: 'admin' });
  const teacherCount = await UserModel.countDocuments({ role: 'teacher' });
  const studentCount = await UserModel.countDocuments({ role: 'student' });
  
  console.log(`Admins:   ${adminCount}`);
  console.log(`Teachers: ${teacherCount}`);
  console.log(`Students: ${studentCount}`);

  console.log('\n=== Sample Users ===\n');
  const users = await UserModel.find().select('username role fullName').limit(8).lean();
  users.forEach(u => {
    console.log(`- ${u.username.padEnd(12)} [${u.role.padEnd(7)}] ${u.fullName}`);
  });

  console.log('\n=== Classes ===\n');
  const classes = await ClassModel.find().select('code name').lean();
  classes.forEach(c => {
    console.log(`- ${c.code.padEnd(8)} ${c.name}`);
  });

  console.log('\n=== Assignments ===\n');
  const assignments = await AssignmentModel.find().select('title isExam').lean();
  assignments.forEach(a => {
    const type = a.isExam ? '[EXAM]' : '[HW]  ';
    console.log(`- ${type} ${a.title}`);
  });

  console.log('\n=== Submission Stats ===\n');
  const submittedCount = await SubmissionModel.countDocuments({ submittedAt: { $ne: null } });
  const gradedCount = await SubmissionModel.countDocuments({ score: { $ne: null } });
  console.log(`Total submissions: ${submissionCount}`);
  console.log(`Submitted:         ${submittedCount}`);
  console.log(`Graded:            ${gradedCount}`);

  console.log('\n=== Database Check Complete ===\n');
  
  await mongoose.connection.close();
  process.exit(0);
}

checkDatabase().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
