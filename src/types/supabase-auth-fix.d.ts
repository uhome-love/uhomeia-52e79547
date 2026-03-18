// Global type augmentations for supabase-js compatibility
// Fixes getSession/getUser not found on SupabaseAuthClient
// and fixes unknown types from PostgREST v14.1 inference

declare module "@supabase/supabase-js" {
  interface SupabaseAuthClient {
    getSession(): Promise<{
      data: { session: import("@supabase/supabase-js").Session | null };
      error: any;
    }>;
    getUser(): Promise<{
      data: { user: import("@supabase/supabase-js").User | null };
      error: any;
    }>;
  }
}

declare module "@supabase/gotrue-js" {
  interface GoTrueClient {
    getSession(): Promise<{
      data: { session: any };
      error: any;
    }>;
    getUser(): Promise<{
      data: { user: any };
      error: any;
    }>;
  }
}
