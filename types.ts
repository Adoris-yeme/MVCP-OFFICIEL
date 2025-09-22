export interface InvitedPerson {
  id: string;
  name: string;
  contact: string;
  address: string;
}

export interface Visit {
  id:string;
  name: string;
  subject: string;
  need: string;
}

export type CellStatus = 'Active' | 'En implantation' | 'En multiplication' | 'En pause';

// FIX: Added Cell interface for cell management feature.
export interface Cell {
  id: string;
  region: string;
  group: string;
  district: string;
  cellName: string;
  cellCategory: string;
  leaderName: string;
  leaderContact?: string;
  status: CellStatus;
}

export interface Report {
  id: string;
  cellDate: string;

  // New hierarchy fields
  region: string;
  group: string;
  district: string;
  cellName: string;
  cellCategory: string;

  leaderName: string;
  leaderContact: string;
  
  // New demographic fields for registered members
  registeredMen: number;
  registeredWomen: number;
  registeredChildren: number;
  
  attendees: number; // Total number of attendees (from registered members)
  absentees: number; // calculated: (registered total) - attendees
  invitedPeople: InvitedPerson[];
  totalPresent: number; // calculated: attendees + invitedPeople.length
  
  visitSchedule: string;
  visitsMade: Visit[];
  
  // Program participation - now numeric for aggregation
  bibleStudy: number;
  miracleHour: number;
  sundayServiceAttendance: number;
  
  evangelismOuting: string; // Remains descriptive text
  
  // New testimony field
  poignantTestimony?: string;

  message: string;
  submittedAt: string; // ISO String
}

export enum UserRole {
    NATIONAL_COORDINATOR = 'national_coordinator',
    REGIONAL_PASTOR = 'regional_pastor',
    GROUP_PASTOR = 'group_pastor',
    DISTRICT_PASTOR = 'district_pastor',
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  region?: string;
  group?: string;
  district?: string;
  status?: 'pending' | 'approved';
  password?: string;
  contact?: string;
}

// Used for creating or updating a pastor
export interface PastorData {
    uid?: string;
    email: string;
    name: string;
    role: UserRole;
    region?: string;
    group?: string;
    district?: string;
    password?: string;
    contact?: string;
}

export interface Group {
  id: string;
  region: string;
  name: string;
}

export interface District {
  id: string;
  region: string;
  group: string;
  name: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string for date
  location: string;
  imageUrl?: string;
  status: 'draft' | 'published';
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string; // base64
  uploadedAt: string; // ISO string
}