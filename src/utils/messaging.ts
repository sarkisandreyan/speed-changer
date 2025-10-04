import type { MessagingPayload, MessagingRequest } from '../types';

export function generateMessageId() {
  const digits = '1234567890';

  let id = '';
  for (let i = 0; i < 9; ++i) {
    id += digits[Math.floor(Math.random() * digits.length)];
  }

  return id;
}

export function isValidMessagingRequest(
  request: unknown,
): request is MessagingRequest {
  return (
    !!request &&
    typeof request === 'object' &&
    'id' in request &&
    typeof request.id === 'string' &&
    'payload' in request
  );
}

export function isValidMessagingPayload(
  payload: unknown,
): payload is MessagingPayload {
  return (
    !!payload &&
    typeof payload === 'object' &&
    'action' in payload &&
    typeof payload.action === 'string'
  );
}
