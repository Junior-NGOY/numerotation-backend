import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface PinataConfig {
  apiKey: string;
  secretApiKey: string;
  gateway: string;
}

class PinataService {
  private config: PinataConfig;

  constructor() {
    this.config = {
      apiKey: process.env.PINATA_API_KEY || '',
      secretApiKey: process.env.PINATA_SECRET_API_KEY || '',
      gateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud'
    };

    if (!this.config.apiKey || !this.config.secretApiKey) {
      console.warn('PINATA credentials not configured. File uploads will use local storage.');
    }
  }

  /**
   * Vérifie si PINATA est configuré
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.secretApiKey);
  }

  /**
   * Upload un fichier vers PINATA
   */
  async uploadFile(filePath: string, fileName: string, metadata?: any): Promise<PinataResponse> {
    if (!this.isConfigured()) {
      throw new Error('PINATA is not configured');
    }

    try {
      const formData = new FormData();
      const fileStream = fs.createReadStream(filePath);
      
      formData.append('file', fileStream);
      
      // Métadonnées optionnelles
      if (metadata) {
        formData.append('pinataMetadata', JSON.stringify({
          name: fileName,
          keyvalues: metadata
        }));
      }

      // Options de pin
      formData.append('pinataOptions', JSON.stringify({
        cidVersion: 0
      }));      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.config.apiKey,
            'pinata_secret_api_key': this.config.secretApiKey,
          },
        }
      );

      return response.data as PinataResponse;} catch (error: any) {
      console.error('Error uploading to PINATA:', error);
      throw new Error(`Failed to upload file to PINATA: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Génère l'URL complète pour accéder au fichier
   */
  generateFileUrl(ipfsHash: string): string {
    return `${this.config.gateway}/ipfs/${ipfsHash}`;
  }

  /**
   * Supprime un fichier de PINATA (unpin)
   */
  async unpinFile(ipfsHash: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('PINATA is not configured');
    }

    try {
      await axios.delete(
        `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            'pinata_api_key': this.config.apiKey,
            'pinata_secret_api_key': this.config.secretApiKey,
          },
        }
      );    } catch (error: any) {
      console.error('Error unpinning from PINATA:', error);
      throw new Error(`Failed to unpin file from PINATA: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Test de la connexion PINATA
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {      const response = await axios.get(
        'https://api.pinata.cloud/data/testAuthentication',
        {
          headers: {
            'pinata_api_key': this.config.apiKey,
            'pinata_secret_api_key': this.config.secretApiKey,
          },
        }
      );
      
      return (response.data as any).message === 'Congratulations! You are communicating with the Pinata API!';} catch (error: any) {
      console.error('PINATA connection test failed:', error);
      return false;
    }
  }
}

export const pinataService = new PinataService();
export default pinataService;
