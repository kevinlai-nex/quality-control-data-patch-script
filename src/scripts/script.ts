import { QueryRunner } from "typeorm";
import { OperationEntityQueryResult } from "./types/operation-entity-query-result.type";
import { RootEntityUserQueryResult } from "./types/root-entity-user-query-result.type";


export async function insertRootEntityUser(
  queryRunner: QueryRunner,
  data: RootEntityUserQueryResult[]
): Promise<RootEntityUserQueryResult[]> {
  const values = data
    .map(
      (d) =>
        `('${d.id}'::uuid, '${d.userId}'::uuid, '${
          d.rootEntityId
        }'::uuid, '${d.createdAt.toJSON()}'::timestamp)`
    )
    .join(", ");
  return queryRunner.query(`
      INSERT INTO root_entity_user (id, "userId", "rootEntityId", "createdAt")
      SELECT val.id, val."userId", val."rootEntityId", val."createdAt"
      FROM (
        VALUES ${values}
      ) val (id, "userId", "rootEntityId", "createdAt")
       JOIN "user" u ON val."userId" = u.id
       ON CONFLICT (id) DO NOTHING RETURNING id, "userId", "rootEntityId", "createdAt";
      `);
}

export async function insertRootEntityUserV2(
  queryRunner: QueryRunner,
  data: RootEntityUserQueryResult[]
): Promise<RootEntityUserQueryResult[]> {
  const values = data
    .map(
      (d) =>
        `('${d.id}'::uuid, '${d.userId}'::varchar, '${
          d.rootEntityId
        }'::uuid, '${d.createdAt.toJSON()}'::timestamp)`
    )
    .join(", ");
  return queryRunner.query(`
        INSERT INTO root_entity_user (id, "userId", "rootEntityId", "createdAt")
        SELECT val.id, val."userId", val."rootEntityId", val."createdAt"
        FROM (
          VALUES ${values}
        ) val (id, "userId", "rootEntityId", "createdAt")
         JOIN "user" u ON val."userId" = u.id
         ON CONFLICT (id) DO NOTHING RETURNING id, "userId", "rootEntityId", "createdAt";
        `);
}
export async function insertRootEntityUserV3(
  queryRunner: QueryRunner,
  data: RootEntityUserQueryResult[]
): Promise<RootEntityUserQueryResult[]> {
  const values = data
    .map(
      (d) =>
        `('${d.id}'::uuid, '${d.userId}'::uuid, '${
          d.rootEntityId
        }'::uuid, '${d.createdAt.toJSON()}'::timestamp)`
    )
    .join(", ");
  return queryRunner.query(`
        INSERT INTO root_entity_qc_user (id, "qcUserId", "rootEntityId", "createdAt")
        SELECT val.id, val."qcUserId", val."rootEntityId", val."createdAt"
        FROM (
          VALUES ${values}
        ) val (id, "qcUserId", "rootEntityId", "createdAt")
         JOIN "user" u ON val."qcUserId"::varchar = u."cpcsId"
         ON CONFLICT (id) DO NOTHING RETURNING id, "qcUserId", "rootEntityId", "createdAt";
        `);
}
export async function updateEntityRootEntityId(
  queryRunner: QueryRunner
): Promise<[OperationEntityQueryResult[], number]> {
  return queryRunner.query(`
          UPDATE entity_initialization AS ei 
          SET "rootEntityId" = reim."rootEntityId"
          FROM  root_entity_id_map reim
          WHERE reim.id = ei.id AND ei."rootEntityId" IS NULL
          RETURNING ei.id, ei."rootEntityId";
      `);
}

export async function updateEntityRootEntityIdV2(
  queryRunner: QueryRunner
): Promise<[OperationEntityQueryResult[], number]> {
  return queryRunner.query(`
            UPDATE entity_initialization AS ei 
            SET "rootEntityId" = reim."rootEntityId"
            FROM  root_entity_id_map reim
            WHERE reim.id = ei."entityId"::uuid AND ei."rootEntityId" IS NULL 
            RETURNING ei."entityId", ei."rootEntityId" 
           ;
        `);
}

export async function insertRootEntityIdMap(
  queryRunner: QueryRunner,
  data: OperationEntityQueryResult[]
): Promise<OperationEntityQueryResult[]> {
  const values = data.map((d) => `('${d.id}', '${d.rootEntityId}')`).join(", ");

  return queryRunner.query(`
          INSERT INTO root_entity_id_map (id, "rootEntityId") VALUES ${values}  ON CONFLICT (id) DO NOTHING RETURNING id, "rootEntityId";
      `);
}
