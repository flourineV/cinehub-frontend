export interface ManagerProfileRequest {
  userProfileId: string;
  managedCinemaName: string;
  hireDate: string; // ISO date string
}

export interface ManagerProfileResponse {
  id: string;
  userProfileId: string;
  managedCinemaName: string;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
  // User profile info if populated
  userProfile?: {
    id: string;
    userId: string; // auth-service user ID
    username: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    avatarUrl?: string;
  };
}
