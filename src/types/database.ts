// Database types generated from Supabase schema
export type UserRole = 'user' | 'admin' | 'superadmin';
export type ServerMemberRole = 'member' | 'admin';
export type ChannelType = 'text' | 'voice' | 'announcements';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type LivestreamStatus = 'scheduled' | 'live' | 'ended';

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface Server {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface ServerMember {
  server_id: string;
  user_id: string;
  role_in_server: ServerMemberRole;
  joined_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: ChannelType;
  sort_order: number;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Course {
  id: string;
  server_id: string;
  title: string;
  description?: string;
  level: CourseLevel;
  thumbnail_url?: string;
  created_by: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  video_url?: string;
  duration_sec: number;
  order_index: number;
  created_at: string;
}

export interface Livestream {
  id: string;
  server_id: string;
  title: string;
  status: LivestreamStatus;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  created_by: string;
  created_at: string;
}

// Extended types with relations
export interface ProfileWithDetails extends Profile {
  servers?: ServerMember[];
}

export interface ServerWithDetails extends Server {
  members?: ServerMember[];
  channels?: Channel[];
  courses?: Course[];
  livestreams?: Livestream[];
  creator?: Profile;
}

export interface ChannelWithDetails extends Channel {
  server?: Server;
  messages?: MessageWithDetails[];
}

export interface MessageWithDetails extends Message {
  user?: Profile;
  channel?: Channel;
}

export interface CourseWithDetails extends Course {
  lessons?: Lesson[];
  creator?: Profile;
  server?: Server;
}

export interface LessonWithDetails extends Lesson {
  course?: Course;
}

export interface LivestreamWithDetails extends Livestream {
  creator?: Profile;
  server?: Server;
}