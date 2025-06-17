import { z } from "zod";

// Schémas de validation pour les utilisateurs
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email("Email invalide"),
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    role: z.enum(["ADMIN", "USER"]).optional()
  })
});

export const loginUserSchema = z.object({
  body: z.object({
    email: z.string().email("Email invalide"),
    password: z.string().min(1, "Mot de passe requis")
  })
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email("Email invalide").optional(),
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
    isActive: z.boolean().optional()
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères")
  })
});

// Schémas de validation pour les propriétaires
export const createProprietaireSchema = z.object({
  body: z.object({
    nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
    adresse: z.string().min(5, "L'adresse doit être complète"),
    telephone: z.string().regex(/^[+]?[0-9\s-()]{8,15}$/, "Numéro de téléphone invalide"),
    numeroPiece: z.string().min(5, "Numéro de pièce invalide"),
    typePiece: z.enum(["CARTE_IDENTITE", "PASSEPORT", "PERMIS_SEJOUR"]),
    lieuDelivrance: z.string().min(2, "Lieu de délivrance requis"),
    dateDelivrance: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Date de délivrance invalide"
    })
  })
});

export const updateProprietaireSchema = z.object({
  body: z.object({
    nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
    prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères").optional(),
    adresse: z.string().min(5, "L'adresse doit être complète").optional(),
    telephone: z.string().regex(/^[+]?[0-9\s-()]{8,15}$/, "Numéro de téléphone invalide").optional(),
    numeroPiece: z.string().min(5, "Numéro de pièce invalide").optional(),
    typePiece: z.enum(["CARTE_IDENTITE", "PASSEPORT", "PERMIS_SEJOUR"]).optional(),
    lieuDelivrance: z.string().min(2, "Lieu de délivrance requis").optional(),
    dateDelivrance: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Date de délivrance invalide"
    }).optional()
  })
});

// Schémas de validation pour les véhicules
export const createVehiculeSchema = z.object({
  body: z.object({
    marque: z.string().min(2, "La marque doit contenir au moins 2 caractères"),
    modele: z.string().min(1, "Le modèle est requis"),
    typeVehicule: z.enum(["BUS", "MINI_BUS", "TAXI"]),
    numeroImmatriculation: z.string().min(6, "Numéro d'immatriculation invalide"),
    numeroChassis: z.string().min(10, "Numéro de châssis invalide"),
    anneeFabrication: z.union([
      z.string().transform((val) => parseInt(val, 10)),
      z.number()
    ]).pipe(z.number().int().min(1900).max(new Date().getFullYear())),
    capaciteAssises: z.union([
      z.string().transform((val) => parseInt(val, 10)),
      z.number()    ]).pipe(z.number().int().min(1).max(100)),
    itineraireId: z.string().cuid("ID itinéraire invalide").optional(),
    codeUnique: z.string().min(8, "Code unique invalide").optional(),
    anneeEnregistrement: z.union([
      z.string().transform((val) => parseInt(val, 10)),
      z.number()
    ]).pipe(z.number().int().min(1900).max(new Date().getFullYear())).optional(),
    proprietaireId: z.string().cuid("ID propriétaire invalide")
  })
});

export const updateVehiculeSchema = z.object({
  body: z.object({
    marque: z.string().min(2, "La marque doit contenir au moins 2 caractères").optional(),
    modele: z.string().min(1, "Le modèle est requis").optional(),
    typeVehicule: z.enum(["BUS", "MINI_BUS", "TAXI"]).optional(),
    numeroImmatriculation: z.string().min(6, "Numéro d'immatriculation invalide").optional(),
    numeroChassis: z.string().min(10, "Numéro de châssis invalide").optional(),
    anneeFabrication: z.union([
      z.string().transform((val) => parseInt(val, 10)),
      z.number()
    ]).pipe(z.number().int().min(1900).max(new Date().getFullYear())).optional(),
    capaciteAssises: z.union([
      z.string().transform((val) => parseInt(val, 10)),
      z.number()
    ]).pipe(z.number().int().min(1).max(100)).optional(),
    itineraireId: z.string().cuid("ID itinéraire invalide").optional(),
    codeUnique: z.string().min(8, "Code unique invalide").optional(),
    anneeEnregistrement: z.union([
      z.string().transform((val) => parseInt(val, 10)),
      z.number()
    ]).pipe(z.number().int().min(1900).max(new Date().getFullYear())).optional(),
    proprietaireId: z.string().cuid("ID propriétaire invalide").optional()
  })
});

// Schémas de validation pour les documents
export const uploadDocumentSchema = z.object({
  body: z.object({
    nom: z.string().min(1, "Le nom du document est requis"),
    type: z.enum(["PIECE_IDENTITE", "PERMIS_CONDUIRE", "CARTE_ROSE", "PDF_COMPLET", "QR_CODE"]),
    proprietaireId: z.string().cuid("ID propriétaire invalide").optional(),
    vehiculeId: z.string().cuid("ID véhicule invalide").optional()
  }).refine((data) => data.proprietaireId || data.vehiculeId, {
    message: "Au moins un proprietaireId ou vehiculeId doit être fourni"
  })
});

export const updateDocumentSchema = z.object({
  body: z.object({
    nom: z.string().min(1, "Le nom du document est requis").optional(),
    type: z.enum(["PIECE_IDENTITE", "PERMIS_CONDUIRE", "CARTE_ROSE", "PDF_COMPLET", "QR_CODE"]).optional()
  })
});

// Schémas de validation pour les paramètres de requête
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional()
  })
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().cuid("ID invalide")
  })
});

// Schémas de validation pour les itinéraires
export const createItineraireSchema = z.object({  body: z.object({
    nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    description: z.string().optional(),
    distance: z.union([
      z.string().transform((val) => val ? parseFloat(val) : null),
      z.number(),
      z.null()
    ]).optional(),
    dureeEstimee: z.union([
      z.string().transform((val) => val ? parseInt(val, 10) : null),
      z.number(),
      z.null()
    ]).optional()
  })
});

export const updateItineraireSchema = z.object({
  body: z.object({
    nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
    description: z.string().optional(),
    distance: z.union([      z.string().transform((val) => val ? parseFloat(val) : null),
      z.number(),
      z.null()
    ]).optional(),
    dureeEstimee: z.union([
      z.string().transform((val) => val ? parseInt(val, 10) : null),
      z.number(),
      z.null()
    ]).optional(),
    isActive: z.boolean().optional()
  })
});
