export type LocalNotificationInput = Readonly<{
  body: string;
  data?: Record<string, string>;
  title: string;
}>;

export interface LocalNotificationService {
  configure(): Promise<void>;
  schedule(input: LocalNotificationInput): Promise<string>;
}
