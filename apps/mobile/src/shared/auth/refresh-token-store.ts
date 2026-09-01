export interface RefreshTokenStore {
  clear(): Promise<void>;
  read(): Promise<string | undefined>;
  write(token: string): Promise<void>;
}
