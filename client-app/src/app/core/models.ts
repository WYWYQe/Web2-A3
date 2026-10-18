// Shared TypeScript interfaces.
// These mirror the JSON shapes returned by the Express API exactly, so the
// editor and the compiler both know what a response looks like.
// A (the backend developer) owns this file - do not rename fields unilaterally.

export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
  event_count?: number;
}

export interface Organisation {
  org_id: number;
  org_name: string;
  mission: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
}

export interface EventRec {
  event_id: number;
  event_name: string;
  summary: string | null;
  description: string | null;
  purpose: string | null;
  event_date: string;              // 'YYYY-MM-DD'
  start_time: string | null;       // 'HH:MM:SS'
  end_time: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  ticket_price: number;
  goal_amount: number;
  raised_amount: number;
  image_url: string | null;
  category_id: number;
  category_name: string;
  org_id: number;
  org_name: string;
  // Only the detail endpoint (GET /api/events/:id) joins the organisations
  // table and returns these. The list endpoint returns org_name only, so they
  // are optional here.
  mission?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  is_suspended?: number;
  event_status: 'upcoming' | 'past';
  progress_percent?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Registration {
  registration_id: number;
  event_id: number;
  user_name: string;
  user_email: string;
  contact_phone: string | null;
  tickets: number;
  registration_date: string;       // 'YYYY-MM-DD HH:MM:SS'
}

export interface NewRegistration {
  event_id: number;
  user_name: string;
  user_email: string;
  contact_phone?: string | null;
  tickets: number;
}
