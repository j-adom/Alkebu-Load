import { env } from '$env/dynamic/private';

export function getPayloadApiUrl(): string {
  const payloadApiUrl = env.PAYLOAD_API_URL;

  if (!payloadApiUrl) {
    throw new Error('PAYLOAD_API_URL is not configured');
  }

  return payloadApiUrl;
}

export function getPayloadAuthHeader(): Record<string, string> {
  const apiKey = env.PAYLOAD_API_KEY?.trim();

  if (!apiKey) {
    return {};
  }

  return { Authorization: `Bearer ${apiKey}` };
}
