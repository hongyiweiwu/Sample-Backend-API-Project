export interface User {
    name: string;
    username: string;
    hashPassword: string;
}

export interface RegisterPayload {
    name: string;
    username: string;
    password: string;
}

export interface LoginPayload {
    username: string;
    password: string;
}