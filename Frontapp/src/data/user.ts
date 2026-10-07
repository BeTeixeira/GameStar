export type UserProfile = {
  name: string;
  username: string;
  email: string;
  bio: string;
  avatarUri: string | null;
  notifyFriendRequests: boolean;
  notifyComments: boolean;
  notifyRecommendations: boolean;
  privateProfile: boolean;
};

export const currentUser: UserProfile = {
  name: "Nome do usuário",
  username: "nomedousuario",
  email: "usuario@email.com",
  bio: "Fale um pouco sobre você e os jogos que mais curte.",
  avatarUri: null,
  notifyFriendRequests: true,
  notifyComments: true,
  notifyRecommendations: false,
  privateProfile: false,
};