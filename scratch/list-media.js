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

  // Query media collection
  const mediaCollection = mongoose.connection.collection('media');
  const media = await mediaCollection.find({}).toArray();
  console.log('Media found in DB:');
  console.log(JSON.stringify(media, null, 2));

  // Query products collection
  const productsCollection = mongoose.connection.collection('products');
  const products = await productsCollection.find({}).toArray();
  console.log('Products found in DB:');
  console.log(JSON.stringify(products, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
