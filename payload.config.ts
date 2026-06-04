import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Products } from "./collections/Products";
import { Categories } from "./collections/Categories";
import { ContactSubmissions } from "./collections/ContactSubmissions";
import { Subscriptions } from "./collections/Subscriptions";
import { Team } from "./collections/Team";
import { Documents } from "./collections/Documents";
import { Videos } from "./collections/Videos";
import { Tasks } from "./collections/Tasks";
import { Notifications } from "./collections/Notifications";
import { startNotificationWorker } from "./lib/queue";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  onInit: async (payload) => {
    await startNotificationWorker(payload);
  },
  cors: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:3000'],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  folders: {
    browseByFolder: true, // optional but useful
    debug: false,
    slug: 'payload-folders', // default
    fieldName: 'folder', // default
  },
  collections: [Users, Media, Pages, Products, ContactSubmissions,
    Subscriptions, Categories, Team, Documents, Videos, Tasks, Notifications,],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || (() => {
    throw new Error('PAYLOAD_SECRET is required');
  })(),
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || (() => {
      throw new Error('DATABASE_URL is required');
    })(),
  }),
  sharp,
  plugins: [],
});
