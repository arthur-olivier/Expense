import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

//-------- Ce fichier cree l'objet prisma qu'on utilise de partout ------

// Décompose la DATABASE_URL en objet de config pour l'adaptateur SQL Server
function parseSqlServerUrl(url: string) {
  const withoutProtocol = url.replace("sqlserver://", "");
  const [hostPort, ...params] = withoutProtocol.split(";");
  const [server, port] = hostPort.split(":");

  const map: Record<string, string> = {};
  for (const param of params) {
    const [key, value] = param.split("=");
    if (key && value) map[key.toLowerCase()] = value;
  }

  return {
    server,
    port: Number(port) || 1433,
    database: map["database"],
    user: map["user"],
    password: map["password"],
  };
}

const config = parseSqlServerUrl(process.env.DATABASE_URL!);

// Adaptateur de connexion à SQL Server
const adapter = new PrismaMssql({
  ...config,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
});

// Réutilise une seule instance Prisma en dev (évite d'ouvrir trop de connexions au hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
