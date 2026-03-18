/**
 * Type compatibility shims for @supabase/supabase-js.
 * Fixes missing type exports and auth method types when the
 * auto-generated Database type uses PostgrestVersion that the
 * installed library version doesn't fully type.
 */

declare module "@supabase/supabase-js" {
  // Re-export commonly used auth types
  export interface User {
    id: string;
    email?: string;
    phone?: string;
    app_metadata: Record<string, any>;
    user_metadata: Record<string, any>;
    aud: string;
    created_at: string;
    [key: string]: any;
  }

  export interface Session {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: User;
    [key: string]: any;
  }
}

declare module "input-otp" {
  import type { Context } from "react";
  export const OTPInput: any;
  export const OTPInputContext: Context<{
    slots: Array<{ char: string | null; hasFakeCaret: boolean; isActive: boolean }>;
    [key: string]: any;
  }>;
}
