export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface UpdateUserRequest {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}
