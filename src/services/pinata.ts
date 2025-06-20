import { PinataSDK } from "pinata-web3";
import fs from 'fs';

interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface PinataConfig {
  jwt: string;
  gateway: string;
}

class PinataService {
  private config: PinataConfig;
  private pinata: PinataSDK | null = null;

  constructor() {
    this.config = {
      jwt: process.env.PINATA_JWT || '',
      gateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud'
    };

    if (this.config.jwt) {
      this.pinata = new PinataSDK({
        pinataJwt: this.config.jwt,
        pinataGateway: this.config.gateway
      });
    } else {
      console.warn('PINATA JWT not configured. File uploads will use local storage.');
    }
  }
  /**
   * Vérifie si PINATA est configuré
   */
  isConfigured(): boolean {
    return !!(this.config.jwt && this.pinata);
  }
  /**
   * Upload un fichier vers PINATA
   */
  async uploadFile(filePath: string, fileName: string, metadata?: any): Promise<PinataUploadResponse> {
    if (!this.isConfigured()) {
      throw new Error('PINATA is not configured');
    }

    try {      // Lire le fichier
      const fileBuffer = fs.readFileSync(filePath);
      const file = new File([new Uint8Array(fileBuffer)], fileName);

      // Préparer les options d'upload
      const uploadOptions: any = {
        metadata: {
          name: fileName,
          ...(metadata && { keyvalues: metadata })
        }
      };

      // Upload vers PINATA
      const result = await this.pinata!.upload.file(file, uploadOptions);

      return {
        IpfsHash: result.IpfsHash,
        PinSize: result.PinSize,
        Timestamp: result.Timestamp || new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error uploading to PINATA:', error);
      throw new Error(`Failed to upload file to PINATA: ${error.message}`);
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
      await this.pinata!.unpin([ipfsHash]);
    } catch (error: any) {
      console.error('Error unpinning from PINATA:', error);
      throw new Error(`Failed to unpin file from PINATA: ${error.message}`);
    }
  }
  /**
   * Test de la connexion PINATA
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Test simple avec une requête pour vérifier la connectivité
      const result = await this.pinata!.testAuthentication();
      return result.message === 'Congratulations! You are communicating with the Pinata API!';
    } catch (error: any) {
      console.error('PINATA connection test failed:', error);
      return false;
    }
  }
}

export const pinataService = new PinataService();
export default pinataService;
