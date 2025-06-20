import { db } from "@/db/db";
import { Request, Response } from "express";
import { getAuthenticatedUser } from "@/types";
import { generateSequentialVehiculeCode, getNextVehicleSequence } from "@/utils/generateSlug";
import { calculateRegistrationPrice } from "@/utils/pricingUtils";
import { pinataService } from "@/services/pinata";
import { unlink } from "fs/promises";

// Fonction de validation et transformation du numéro d'immatriculation
function validateAndTransformImmatriculation(numeroImmatriculation: string): { isValid: boolean; transformed: string; error?: string } {
  if (!numeroImmatriculation) {
    return { isValid: false, transformed: '', error: 'Le numéro d\'immatriculation est requis' };
  }

  // Supprimer tous les espaces et convertir en majuscules
  const cleaned = numeroImmatriculation.replace(/\s+/g, '').toUpperCase();

  // Vérifier la longueur exacte (6 caractères)
  if (cleaned.length !== 6) {
    return { 
      isValid: false, 
      transformed: cleaned, 
      error: 'Le numéro d\'immatriculation doit contenir exactement 6 caractères (ex: 5518AQ)' 
    };
  }

  // Vérifier le format : chiffres et lettres uniquement
  const validFormat = /^[A-Z0-9]{6}$/.test(cleaned);
  if (!validFormat) {
    return { 
      isValid: false, 
      transformed: cleaned, 
      error: 'Le numéro d\'immatriculation ne peut contenir que des lettres et des chiffres (ex: 5518AQ)' 
    };
  }

  return { isValid: true, transformed: cleaned };
}

// Fonction utilitaire pour déterminer le type de document basé sur le nom du fichier
function determineDocumentType(filename: string): 'CARTE_ROSE' | 'PERMIS_CONDUIRE' | 'PDF_COMPLET' {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes('carte') || lowerFilename.includes('rose') || lowerFilename.includes('grise')) {
    return 'CARTE_ROSE';
  } else if (lowerFilename.includes('permis') || lowerFilename.includes('conduire')) {
    return 'PERMIS_CONDUIRE';
  } else {
    return 'PDF_COMPLET';
  }
}

// Créer un véhicule
export async function createVehicule(req: Request, res: Response) {
  const {
    marque,
    modele,
    typeVehicule,
    numeroImmatriculation,
    numeroChassis,
    anneeFabrication,
    capaciteAssises,
    itineraireId,
    codeUnique: providedCodeUnique,
    anneeEnregistrement,
    proprietaireId
  } = req.body;
  
  const { userId: createdById } = getAuthenticatedUser(req);

  try {
    // Convertir les champs numériques
    const anneeFabricationInt = parseInt(anneeFabrication);
    const capaciteAssisesInt = parseInt(capaciteAssises);
    
    // Validation des champs numériques
    if (isNaN(anneeFabricationInt) || anneeFabricationInt < 1900 || anneeFabricationInt > new Date().getFullYear() + 1) {
      return res.status(400).json({
        data: null,
        error: "L'année de fabrication doit être un nombre valide entre 1900 et l'année courante"
      });
    }
    
    if (isNaN(capaciteAssisesInt) || capaciteAssisesInt < 1 || capaciteAssisesInt > 100) {
      return res.status(400).json({
        data: null,
        error: "La capacité d'assises doit être un nombre valide entre 1 et 100"
      });
    }

    // Validation et transformation du numéro d'immatriculation
    const immatriculationValidation = validateAndTransformImmatriculation(numeroImmatriculation);
    if (!immatriculationValidation.isValid) {
      return res.status(400).json({
        data: null,
        error: immatriculationValidation.error
      });
    }
    const normalizedNumeroImmatriculation = immatriculationValidation.transformed;

    // Utiliser l'année courante si anneeEnregistrement n'est pas fournie
    const finalAnneeEnregistrement = anneeEnregistrement || new Date().getFullYear();// Générer un code unique séquentiel si non fourni
    let codeUnique = providedCodeUnique;
    if (!codeUnique) {      console.log(`🚀 Génération du code unique pour: année=${finalAnneeEnregistrement}, immat=${normalizedNumeroImmatriculation}`);
      
      try {
        const nextSequence = await getNextVehicleSequence(finalAnneeEnregistrement, normalizedNumeroImmatriculation);
        codeUnique = generateSequentialVehiculeCode(finalAnneeEnregistrement, nextSequence, normalizedNumeroImmatriculation);
        
        console.log(`✅ Code unique généré: ${codeUnique}`);
        
        // Vérifier que le code généré n'existe pas déjà (sécurité supplémentaire)
        const existingVehicle = await db.vehicule.findUnique({ where: { codeUnique } });
        if (existingVehicle) {
          console.log(`⚠️ Conflit détecté pour le code: ${codeUnique}`);
          return res.status(500).json({
            data: null,
            error: "Conflit de génération de code unique, veuillez réessayer"
          });
        }
      } catch (error) {
        console.error('❌ Erreur lors de la génération du code unique:', error);
        return res.status(500).json({
          data: null,
          error: "Erreur lors de la génération du code unique"
        });
      }
    }
    // Vérifier si le propriétaire existe
    const proprietaire = await db.proprietaire.findUnique({
      where: { id: proprietaireId }
    });

    if (!proprietaire) {
      return res.status(404).json({
        data: null,
        error: "Propriétaire non trouvé"
      });
    }    // Vérifier l'unicité des identifiants du véhicule (sauf le code unique déjà vérifié)
    const [existingImmatriculation, existingChassis] = await Promise.all([
      db.vehicule.findUnique({ where: { numeroImmatriculation: normalizedNumeroImmatriculation } }),
      db.vehicule.findUnique({ where: { numeroChassis } })
    ]);

    if (existingImmatriculation) {
      return res.status(409).json({
        data: null,
        error: "Ce numéro d'immatriculation existe déjà"
      });
    }

    if (existingChassis) {
      return res.status(409).json({
        data: null,
        error: "Ce numéro de châssis existe déjà"
      });
    }

    // Vérifier le code unique seulement s'il a été fourni manuellement
    if (providedCodeUnique) {
      const existingCodeUnique = await db.vehicule.findUnique({ where: { codeUnique } });
      if (existingCodeUnique) {
        return res.status(409).json({
          data: null,
          error: "Ce code unique existe déjà"
        });
      }
    }    // Calculer le prix d'enregistrement automatiquement selon le type de véhicule
    const prixEnregistrement = calculateRegistrationPrice(typeVehicule);

const newVehicule = await db.vehicule.create({
      data: {
        marque,
        modele,
        typeVehicule,
        numeroImmatriculation: normalizedNumeroImmatriculation,
        numeroChassis,
        anneeFabrication: anneeFabricationInt,
        capaciteAssises: capaciteAssisesInt,
        itineraireId,
        codeUnique,
        anneeEnregistrement: finalAnneeEnregistrement,
        prixEnregistrement,
        proprietaireId,
        createdById
      },
      include: {
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true
          }
        },
        itineraire: {
          select: {
            id: true,
            nom: true,
            description: true,
            distance: true,
            duree: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    // Gestion de l'upload des documents du véhicule si des fichiers sont fournis
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      console.log(`📄 Upload de ${req.files.length} document(s) pour le véhicule...`);
      
      for (const file of req.files) {
        try {
          let documentData: any = {};
          
          // Déterminer le type de document basé sur le nom du fichier ou un champ spécifique
          const documentType = determineDocumentType(file.originalname);
          
          // Tentative d'upload vers PINATA si configuré
          if (pinataService.isConfigured()) {
            console.log(`📤 Upload document ${file.originalname} vers PINATA...`);
            const pinataResult = await pinataService.uploadFile(
              file.path,
              file.filename,
              {
                type: documentType,
                vehiculeId: newVehicule.id,
                vehiculeInfo: `${marque} ${modele} - ${numeroImmatriculation}`,
                uploadedBy: createdById
              }
            );

            const pinataUrl = pinataService.generateFileUrl(pinataResult.IpfsHash);
              documentData = {
              nom: `${documentType} - ${marque} ${modele}`,
              type: documentType,
              chemin: pinataUrl,
              taille: file.size,
              mimeType: file.mimetype,
              vehiculeId: newVehicule.id,
              createdById
            };

            // Supprimer le fichier local après upload réussi vers PINATA
            try {
              await unlink(file.path);
              console.log(`🗑️ Fichier local ${file.filename} supprimé après upload PINATA`);
            } catch (unlinkError) {
              console.warn('⚠️ Impossible de supprimer le fichier local:', unlinkError);
            }            console.log(`✅ Document ${file.originalname} uploadé vers PINATA:`, pinataUrl);
          } else {
            // PINATA n'est pas configuré - retourner une erreur
            console.error(`❌ PINATA non configuré, impossible d'uploader ${file.originalname}`);
            throw new Error('Service de stockage de fichiers non configuré. Veuillez configurer PINATA.');
          }

          // Créer l'enregistrement du document
          await db.document.create({
            data: documentData
          });

          console.log(`✅ Document ${documentType} créé avec succès pour le véhicule`);
        } catch (documentError) {
          console.error(`❌ Erreur lors de l'upload du document ${file.originalname}:`, documentError);
          // On continue avec les autres fichiers
        }
      }
    }

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "CREATE",
        table: "Vehicule",
        recordId: newVehicule.id,
        newValues: newVehicule,
        userId: createdById
      }
    });    return res.status(201).json({
      data: transformVehiculeItineraire(newVehicule),
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la création du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir tous les véhicules
export async function getVehicules(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      typeVehicule,
      proprietaireId,
      anneeFabrication
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Recherche par marque, modèle, immatriculation ou propriétaire
    if (search) {
      where.OR = [
        { marque: { contains: search as string, mode: "insensitive" } },
        { modele: { contains: search as string, mode: "insensitive" } },
        { numeroImmatriculation: { contains: search as string, mode: "insensitive" } },
        { numeroChassis: { contains: search as string, mode: "insensitive" } },
        { codeUnique: { contains: search as string, mode: "insensitive" } },
        { 
          proprietaire: {
            OR: [
              { nom: { contains: search as string, mode: "insensitive" } },
              { prenom: { contains: search as string, mode: "insensitive" } }
            ]
          }
        }
      ];
    }

    if (typeVehicule) {
      where.typeVehicule = typeVehicule;
    }

    if (proprietaireId) {
      where.proprietaireId = proprietaireId;
    }

    if (anneeFabrication) {
      where.anneeFabrication = parseInt(anneeFabrication as string);
    }    const [vehicules, total] = await Promise.all([
      db.vehicule.findMany({
        where,        include: {
          proprietaire: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              adresse: true,
              telephone: true,
              numeroPiece: true,
              typePiece: true,
              lieuDelivrance: true,
              dateDelivrance: true
            }
          },
          itineraire: {
            select: {
              id: true,
              nom: true,
              description: true,
              distance: true,
              duree: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              documents: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" }
      }),
      db.vehicule.count({ where })
    ]);return res.status(200).json({
      data: {
        items: transformVehicules(vehicules),  // Changé de "vehicules" à "items" pour cohérence
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des véhicules:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir un véhicule par ID
export async function getVehiculeById(req: Request, res: Response) {
  const { id } = req.params;

  try {    const vehicule = await db.vehicule.findUnique({
      where: { id },
      include: {
        proprietaire: true,
        itineraire: {
          select: {
            id: true,
            nom: true,
            description: true,
            distance: true,
            duree: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        documents: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    if (!vehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }    return res.status(200).json({
      data: transformVehiculeItineraire(vehicule),
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Mettre à jour un véhicule
export async function updateVehicule(req: Request, res: Response) {
  const { id } = req.params;
  const {
    marque,
    modele,
    typeVehicule,
    numeroImmatriculation,
    numeroChassis,
    anneeFabrication,
    capaciteAssises,
    itineraireId,
    codeUnique,
    anneeEnregistrement,
    proprietaireId
  } = req.body;
  
  const { userId } = getAuthenticatedUser(req);

  try {
    // Convertir les champs numériques si fournis
    let anneeFabricationInt;
    let capaciteAssisesInt;
    
    if (anneeFabrication !== undefined) {
      anneeFabricationInt = parseInt(anneeFabrication);
      if (isNaN(anneeFabricationInt) || anneeFabricationInt < 1900 || anneeFabricationInt > new Date().getFullYear() + 1) {
        return res.status(400).json({
          data: null,
          error: "L'année de fabrication doit être un nombre valide entre 1900 et l'année courante"
        });
      }
    }
      if (capaciteAssises !== undefined) {
      capaciteAssisesInt = parseInt(capaciteAssises);
      if (isNaN(capaciteAssisesInt) || capaciteAssisesInt < 1 || capaciteAssisesInt > 100) {
        return res.status(400).json({
          data: null,
          error: "La capacité d'assises doit être un nombre valide entre 1 et 100"
        });
      }
    }

    // Validation et transformation du numéro d'immatriculation
    let normalizedNumeroImmatriculation = numeroImmatriculation;
    if (numeroImmatriculation) {
      const immatriculationValidation = validateAndTransformImmatriculation(numeroImmatriculation);
      if (!immatriculationValidation.isValid) {
        return res.status(400).json({
          data: null,
          error: immatriculationValidation.error
        });
      }
      normalizedNumeroImmatriculation = immatriculationValidation.transformed;
    }

    const existingVehicule = await db.vehicule.findUnique({
      where: { id }
    });

    if (!existingVehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }

    // Vérifier le propriétaire si changé
    if (proprietaireId && proprietaireId !== existingVehicule.proprietaireId) {
      const proprietaire = await db.proprietaire.findUnique({
        where: { id: proprietaireId }
      });

      if (!proprietaire) {
        return res.status(404).json({
          data: null,
          error: "Propriétaire non trouvé"
        });
      }
    }    // Vérifier l'unicité des identifiants modifiés
    const checks = [];
    if (normalizedNumeroImmatriculation && normalizedNumeroImmatriculation !== existingVehicule.numeroImmatriculation) {
      checks.push(
        db.vehicule.findUnique({ where: { numeroImmatriculation: normalizedNumeroImmatriculation } })
          .then(result => ({ type: 'immatriculation', exists: !!result }))
      );
    }
    if (numeroChassis && numeroChassis !== existingVehicule.numeroChassis) {
      checks.push(
        db.vehicule.findUnique({ where: { numeroChassis } })
          .then(result => ({ type: 'chassis', exists: !!result }))
      );
    }
    if (codeUnique && codeUnique !== existingVehicule.codeUnique) {
      checks.push(
        db.vehicule.findUnique({ where: { codeUnique } })
          .then(result => ({ type: 'code', exists: !!result }))
      );
    }

    const results = await Promise.all(checks);
    const conflicts = results.filter(r => r.exists);

    if (conflicts.length > 0) {
      const conflictTypes = {
        immatriculation: "Ce numéro d'immatriculation existe déjà",
        chassis: "Ce numéro de châssis existe déjà",
        code: "Ce code unique existe déjà"
      };
      
      return res.status(409).json({
        data: null,
        error: conflictTypes[conflicts[0].type as keyof typeof conflictTypes]
      });
    }    const oldValues = {
      marque: existingVehicule.marque,
      modele: existingVehicule.modele,
      typeVehicule: existingVehicule.typeVehicule,
      numeroImmatriculation: existingVehicule.numeroImmatriculation,
      numeroChassis: existingVehicule.numeroChassis,
      anneeFabrication: existingVehicule.anneeFabrication,
      capaciteAssises: existingVehicule.capaciteAssises,
      itineraireId: existingVehicule.itineraireId,
      codeUnique: existingVehicule.codeUnique,
      anneeEnregistrement: existingVehicule.anneeEnregistrement,
      prixEnregistrement: existingVehicule.prixEnregistrement,
      proprietaireId: existingVehicule.proprietaireId
    };

    // Recalculer le prix si le type de véhicule change
    const finalTypeVehicule = typeVehicule || existingVehicule.typeVehicule;
    const prixEnregistrement = typeVehicule ? calculateRegistrationPrice(typeVehicule) : existingVehicule.prixEnregistrement;

    const updatedVehicule = await db.vehicule.update({
      where: { id },
      data: {
        ...(marque && { marque }),
        ...(modele && { modele }),
        ...(typeVehicule && { typeVehicule, prixEnregistrement }),
        ...(numeroImmatriculation && { numeroImmatriculation: normalizedNumeroImmatriculation }),
        ...(numeroChassis && { numeroChassis }),        ...(anneeFabricationInt !== undefined && { anneeFabrication: anneeFabricationInt }),
        ...(capaciteAssisesInt !== undefined && { capaciteAssises: capaciteAssisesInt }),
        ...(itineraireId && { itineraireId }),
        ...(codeUnique && { codeUnique }),
        ...(anneeEnregistrement && { anneeEnregistrement }),        ...(proprietaireId && { proprietaireId })
      },
      include: {
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            adresse: true,
            telephone: true,
            numeroPiece: true,
            typePiece: true,
            lieuDelivrance: true,
            dateDelivrance: true
          }
        },
        itineraire: {
          select: {
            id: true,
            nom: true,
            description: true,
            distance: true,
            duree: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        table: "Vehicule",
        recordId: id,
        oldValues,
        newValues: updatedVehicule,
        userId
      }
    });    return res.status(200).json({
      data: transformVehiculeItineraire(updatedVehicule),
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Supprimer un véhicule
export async function deleteVehicule(req: Request, res: Response) {
  const { id } = req.params;
  
  const { userId } = getAuthenticatedUser(req);

  try {
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      include: {
        documents: true, // Récupérer tous les documents associés
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    if (!vehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }

    // Supprimer tous les documents associés au véhicule
    if (vehicule.documents && vehicule.documents.length > 0) {
      console.log(`🗑️ Suppression de ${vehicule.documents.length} document(s) associé(s) au véhicule ${id}`);
      
      for (const document of vehicule.documents) {
        try {
          // Supprimer le fichier de Pinata si l'URL contient un hash IPFS
          if (document.chemin && document.chemin.includes('ipfs')) {
            const ipfsHashMatch = document.chemin.match(/\/ipfs\/([^?]+)/);
            if (ipfsHashMatch) {
              const ipfsHash = ipfsHashMatch[1];
              console.log(`🗑️ Suppression du fichier IPFS: ${ipfsHash}`);
                // Import dynamique du service Pinata
              const { pinataService } = await import('@/services/pinata');
              if (pinataService.isConfigured()) {
                try {
                  await pinataService.unpinFile(ipfsHash);
                  console.log(`✅ Fichier IPFS supprimé: ${ipfsHash}`);
                } catch (pinataError) {
                  console.warn(`⚠️ Erreur lors de la suppression du fichier IPFS ${ipfsHash}:`, pinataError);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Erreur lors de la suppression du fichier pour le document ${document.id}:`, error);
        }
      }

      // Supprimer les documents de la base de données
      await db.document.deleteMany({
        where: { vehiculeId: id }
      });
    }

    // Supprimer le véhicule
    await db.vehicule.delete({
      where: { id }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "DELETE",
        table: "Vehicule",
        recordId: id,
        oldValues: { 
          ...vehicule, 
          documentsDeleted: vehicule.documents?.length || 0 
        },
        userId
      }
    });

    return res.status(200).json({
      data: { 
        message: "Véhicule supprimé avec succès",
        documentsDeleted: vehicule.documents?.length || 0
      },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les statistiques des véhicules
export async function getVehiculesStats(req: Request, res: Response) {
  try {
    const [
      totalVehicules,
      repartitionTypeVehicule,
      vehiculesParAnnee,
      vehiculesAvecDocuments,
      vehiculesSansDocuments
    ] = await Promise.all([
      db.vehicule.count(),
      db.vehicule.groupBy({
        by: ['typeVehicule'],
        _count: {
          id: true
        }
      }),
      db.vehicule.groupBy({
        by: ['anneeFabrication'],
        _count: {
          id: true
        },
        orderBy: {
          anneeFabrication: 'desc'
        },
        take: 10
      }),
      db.vehicule.count({
        where: {
          documents: {
            some: {}
          }
        }
      }),
      db.vehicule.count({
        where: {
          documents: {
            none: {}
          }
        }
      })
    ]);

    const stats = {
      total: totalVehicules,
      avecDocuments: vehiculesAvecDocuments,
      sansDocuments: vehiculesSansDocuments,
      repartitionTypeVehicule: repartitionTypeVehicule.map(item => ({
        type: item.typeVehicule,
        count: item._count.id
      })),
      vehiculesParAnnee: vehiculesParAnnee.map(item => ({
        annee: item.anneeFabrication,
        count: item._count.id
      }))
    };

    return res.status(200).json({
      data: stats,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Recherche de véhicules par code unique ou immatriculation
export async function searchVehicule(req: Request, res: Response) {
  const { query } = req.params;

  try {
    const vehicule = await db.vehicule.findFirst({
      where: {
        OR: [
          { codeUnique: query },
          { numeroImmatriculation: query },
          { numeroChassis: query }
        ]
      },
      include: {
        proprietaire: true,
        documents: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!vehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }

    return res.status(200).json({
      data: vehicule,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la recherche du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Helper function to transform itinerary data in vehicle objects
function transformVehiculeItineraire(vehicule: any) {
  if (!vehicule) return vehicule;
  
  if (vehicule.itineraire && vehicule.itineraire.duree !== undefined) {
    const { duree, ...itineraireRest } = vehicule.itineraire;
    return {
      ...vehicule,
      itineraire: {
        ...itineraireRest,
        dureeEstimee: duree
      }
    };
  }
  
  return vehicule;
}

// Helper function to transform array of vehicles
function transformVehicules(vehicules: any[]) {
  return vehicules.map(transformVehiculeItineraire);
}
