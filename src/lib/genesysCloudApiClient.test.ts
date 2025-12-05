
import GenesysCloudApiClient from './genesysCloudApiClient';

describe('GenesysCloudApiClient', () => {
  it('should authenticate and fetch phone numbers', async () => {
    const { GENESYS_CLIENT_ID, GENESYS_CLIENT_SECRET, GENESYS_API_URL } = process.env;

    if (!GENESYS_CLIENT_ID || !GENESYS_CLIENT_SECRET || !GENESYS_API_URL) {
      console.warn('Skipping GenesysCloudApiClient test: credentials are not configured.');
      return;
    }

    const client = new GenesysCloudApiClient(GENESYS_CLIENT_ID, GENESYS_CLIENT_SECRET, GENESYS_API_URL);
    const phoneNumbers = await client.getPhoneNumbers();

    expect(phoneNumbers).toBeInstanceOf(Array);
  });
});
