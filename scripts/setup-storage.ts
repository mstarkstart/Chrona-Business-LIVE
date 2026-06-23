import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load local environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  console.log("Setting up avatars storage bucket...");

  // 1. Create the bucket
  const { data: bucketData, error: bucketError } = await supabase.storage.createBucket("avatars", {
    public: true,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
    fileSizeLimit: 5242880, // 5MB
  });

  if (bucketError) {
    if (bucketError.message.includes("already exists")) {
      console.log("Bucket 'avatars' already exists.");
    } else {
      console.error("Error creating bucket:", bucketError);
    }
  } else {
    console.log("Bucket 'avatars' created successfully:", bucketData);
  }

  // 2. Setup database policies for storage (run SQL commands if any, but since we cannot directly execute SQL, 
  // we assume we have written the migration. If the migration was not run, the user can run the migration file 0013.)
  console.log("Storage bucket verification finished.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
