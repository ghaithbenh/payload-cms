import mongoose from 'mongoose';

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  console.log('Connecting to database...');
  await mongoose.connect(url);
  console.log('Connected!');

  // Query pages collection
  const pagesCollection = mongoose.connection.collection('pages');
  const pages = await pagesCollection.find({}).toArray();
  console.log('Pages found in DB:');
  console.log(JSON.stringify(pages, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
