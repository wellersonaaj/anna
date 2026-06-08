import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const FAILED_MIGRATION = "20260608160000_gestao_fases_2_3";
const MIGRATION_SQL_PATH = "prisma/migrations/20260608160000_gestao_fases_2_3/migration.sql";

const run = (command) => {
  execSync(command, { stdio: "inherit" });
};

const tryMigrateDeploy = () => {
  try {
    execSync("npx prisma migrate deploy", { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
    console.log("[migrate] deploy succeeded");
    return { ok: true, output: "" };
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}${error.message ?? ""}`;
    console.error(output);
    return { ok: false, output };
  }
};

const gestaoSchemaPresent = async (prisma) => {
  const [row] = await prisma.$queryRaw`
    SELECT
      to_regclass('public."BrechoDespesa"') IS NOT NULL AS "brechoDespesa",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Venda'
          AND column_name = 'freteCustoLoja'
      ) AS "vendaFreteCusto",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Remessa'
          AND column_name = 'freteCustoLoja'
      ) AS "remessaFreteCusto"
  `;

  return Boolean(row?.brechoDespesa && row?.vendaFreteCusto && row?.remessaFreteCusto);
};

const hasFailedGestaoMigration = async (prisma) => {
  const rows = await prisma.$queryRaw`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${FAILED_MIGRATION}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
  `;

  return rows.length > 0;
};

const applyGestaoMigrationSql = () => {
  run(`npx prisma db execute --file ${MIGRATION_SQL_PATH} --schema prisma/schema.prisma`);
};

const healFailedGestaoMigration = async (prisma) => {
  const failed = await hasFailedGestaoMigration(prisma);
  if (!failed) {
    console.log("[migrate] no failed gestao migration record to heal");
    return false;
  }

  if (await gestaoSchemaPresent(prisma)) {
    console.log("[migrate] gestao schema already present — marking migration as applied");
    run(`npx prisma migrate resolve --applied ${FAILED_MIGRATION}`);
    return true;
  }

  console.log("[migrate] applying gestao migration SQL, then marking as applied");
  try {
    applyGestaoMigrationSql();
  } catch (error) {
    if (await gestaoSchemaPresent(prisma)) {
      console.log("[migrate] SQL partially applied; schema now present — resolving as applied");
    } else {
      throw error;
    }
  }

  run(`npx prisma migrate resolve --applied ${FAILED_MIGRATION}`);
  return true;
};

const main = async () => {
  const first = tryMigrateDeploy();
  if (first.ok) {
    return;
  }

  const isBlocked =
    first.output.includes("P3009") || first.output.includes(FAILED_MIGRATION) || first.output.includes("failed migrations");

  if (!isBlocked) {
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const healed = await healFailedGestaoMigration(prisma);
    if (!healed) {
      console.error("[migrate] could not heal failed migration");
      process.exit(1);
    }

    const second = tryMigrateDeploy();
    if (!second.ok) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  console.error("[migrate] unexpected error", error);
  process.exit(1);
});
