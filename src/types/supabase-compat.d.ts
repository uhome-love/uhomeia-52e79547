/**
 * Type compatibility augmentations for supabase-js auth client.
 */

export {};

declare module "@supabase/supabase-js" {
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

declare module "@tanstack/react-query" {
  export const keepPreviousData: any;
}
