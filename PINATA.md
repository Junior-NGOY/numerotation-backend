# Configuration PINATA

## 📁 Upload de fichiers avec PINATA

Ce projet utilise PINATA (IPFS) pour stocker les fichiers de manière décentralisée et sécurisée.

### 🔐 Configuration

1. **Créer un compte PINATA** : https://app.pinata.cloud/
2. **Générer un JWT Token** :
   - Allez dans "API Keys" → "New Key"
   - Sélectionnez les permissions nécessaires
   - Copiez le JWT Token

3. **Configurer les variables d'environnement** :
```env
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_GATEWAY=https://gateway.pinata.cloud
```

### 🚀 Fonctionnement

- **Avec PINATA configuré** : Les fichiers sont uploadés sur IPFS
- **Sans PINATA** : Les fichiers sont stockés localement (fallback)

### ✅ Test de configuration

Pour tester votre configuration PINATA :

```bash
npm run test-pinata
```

### 📤 Usage dans l'application

Les fichiers sont automatiquement uploadés vers PINATA lors de :
- L'enregistrement d'un propriétaire (pièce d'identité)
- L'enregistrement d'un véhicule (documents scannés)

### 🔄 Avantages de PINATA

- **Décentralisé** : Vos fichiers sont stockés sur IPFS
- **Rapide** : CDN global pour un accès rapide
- **Sécurisé** : Hachage cryptographique des fichiers
- **Persistant** : Les fichiers restent accessibles
