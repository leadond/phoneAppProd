
import axios from 'axios';
import { dataService } from '../services/dataService';

export interface GenesysCloudPhoneNumber {
  id: string;
  name: string;
  selfUri: string;
}

class GenesysCloudApiClient {
  private clientId: string;
  private clientSecret: string;
  private apiUrl: string;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(clientId: string, clientSecret: string, apiUrl: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.apiUrl = apiUrl;
  }

  private async authenticate() {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await axios.post(
      `${this.apiUrl}/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    this.token = response.data.access_token;
    this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
  }

  public async getPhoneNumbers(): Promise<GenesysCloudPhoneNumber[]> {
    await this.authenticate();

    const response = await axios.get(`${this.apiUrl}/api/v2/telephony/providers/edges/phones`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    return response.data.entities;
  }
}

export default GenesysCloudApiClient;
