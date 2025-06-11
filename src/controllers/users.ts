import { db } from "@/db/db";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Créer un utilisateur
export async function createUser(req: Request, res: Response) {
  const { email, name, password, role } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        data: null,
        error: "Un utilisateur avec cet email existe déjà"
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const newUser = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || "USER"
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "CREATE",
        table: "User",
        recordId: newUser.id,
        newValues: newUser,
        userEmail: email
      }
    });

    return res.status(201).json({
      data: newUser,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Authentifier un utilisateur
export async function loginUser(req: Request, res: Response) {
  const { email, password } = req.body;

  try {
    // Trouver l'utilisateur
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        data: null,
        error: "Email ou mot de passe incorrect"
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        data: null,
        error: "Email ou mot de passe incorrect"
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json({
        data: null,
        error: "Compte désactivé"
      });
    }

    // Mettre à jour la dernière connexion
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    };

    return res.status(200).json({
      data: {
        user: userResponse,
        token
      },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir tous les utilisateurs
export async function getUsers(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: {
              createdProprietaires: true,
              createdVehicules: true,
              createdDocuments: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" }
      }),
      db.user.count({ where })
    ]);    return res.status(200).json({
      data: {
        items: users,  // Changé de "users" à "items" pour cohérence
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
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir un utilisateur par ID
export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdProprietaires: true,
            createdVehicules: true,
            createdDocuments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        data: null,
        error: "Utilisateur non trouvé"
      });
    }

    return res.status(200).json({
      data: user,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Mettre à jour un utilisateur
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { email, name, role, isActive } = req.body;
  
  // Vérification de sécurité pour req.user
  if (!req.user) {
    return res.status(401).json({
      data: null,
      error: "Non authentifié"
    });
  }
  
  const { userId: currentUserId } = req.user;

  try {
    // Vérifier si l'utilisateur existe
    const existingUser = await db.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        data: null,
        error: "Utilisateur non trouvé"
      });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email && email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(409).json({
          data: null,
          error: "Cet email est déjà utilisé"
        });
      }
    }

    const oldValues = {
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role,
      isActive: existingUser.isActive
    };

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...(email && { email }),
        ...(name && { name }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        table: "User",
        recordId: id,
        oldValues,
        newValues: updatedUser,
        userId: currentUserId
      }
    });

    return res.status(200).json({
      data: updatedUser,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Supprimer un utilisateur
export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  
  // Vérification de sécurité pour req.user
  if (!req.user) {
    return res.status(401).json({
      data: null,
      error: "Non authentifié"
    });
  }
  
  const { userId: currentUserId } = req.user;

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({
        data: null,
        error: "Utilisateur non trouvé"
      });
    }

    await db.user.delete({
      where: { id }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "DELETE",
        table: "User",
        recordId: id,
        oldValues: user,
        userId: currentUserId
      }
    });

    return res.status(200).json({
      data: { message: "Utilisateur supprimé avec succès" },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Changer le mot de passe
export async function changePassword(req: Request, res: Response) {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;
  
  // Vérification de sécurité pour req.user
  if (!req.user) {
    return res.status(401).json({
      data: null,
      error: "Non authentifié"
    });
  }
  
  const { userId: currentUserId } = req.user;

  try {
    const user = await db.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        data: null,
        error: "Utilisateur non trouvé"
      });
    }

    // Vérifier l'ancien mot de passe
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      return res.status(400).json({
        data: null,
        error: "Ancien mot de passe incorrect"
      });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id },
      data: { password: hashedNewPassword }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "PASSWORD_CHANGE",
        table: "User",
        recordId: id,
        userId: currentUserId
      }
    });

    return res.status(200).json({
      data: { message: "Mot de passe modifié avec succès" },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}
