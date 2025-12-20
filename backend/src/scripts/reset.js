import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo } from '../db/mongo.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { AssignmentModel } from '../models/Assignment.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { SubmissionModel } from '../models/Submission.js';

async function run() {
  await connectMongo();

  // WARNING: This wipes data in target collections
  const collections = [
    SubmissionModel,
    AssignmentModel,
    EnrollmentModel,
    ClassModel,
  ];

  for (const model of collections) {
    const name = model.collection.collectionName;
    try {
      const res = await model.deleteMany({});
      // eslint-disable-next-line no-console
      console.log(`Cleared ${name}:`, res.deletedCount);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Failed to clear ${name}:`, e?.message || e);
    }
  }

  // Optionally keep users, or clear non-admins only
  // await UserModel.deleteMany({ role: { $ne: 'admin' } });

  await mongoose.connection.close();
  // eslint-disable-next-line no-console
  console.log('Reset completed');
  process.exit(0);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


