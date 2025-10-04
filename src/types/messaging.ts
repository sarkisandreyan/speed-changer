// TODO: Strongly type action-data pairs.
export type MessagingPayload = {
  action: string;
  data?: any;
};

export type MessagingRequest = {
  id: string;
  payload: MessagingPayload;
};

export type MessagingResponse = {
  id: string;
  body: unknown;
};
