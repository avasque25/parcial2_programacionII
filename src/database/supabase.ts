import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://qhomrvorxrkcyfzoosaf.supabase.co"
).trim();
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  "sb_publishable_pVOP24upnscshfQckUXmig_0KpRu2WW";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
