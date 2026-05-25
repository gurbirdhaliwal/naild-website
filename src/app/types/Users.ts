export type User = {
    firstname: string;
    lastname: string;
    email: string;
    createdAt?: string;
    authProvider?: string | null;
    aureonVoiceId?: string | null;
};
