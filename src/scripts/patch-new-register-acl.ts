import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import {
  generateOutputFilename,
  logMessage,
  storeResultsToFile,
} from "./lib/data-patch-util.helper";
import configuration from "../configs/configuration";
import {
  insertEntityRoles,
  insertRootEntityIdMap,
  updateEntityRootEntityId,
} from "./script";
import { OperationEntityQueryResult } from "./types/operation-entity-query-result.type";
import { EntityRoleQueryResult } from "./types/entity-role-query-result.type";

const LOG_TAG = "patch-new-register-acl.ts";

async function getConnectedDatasource(
  options: DataSourceOptions,
  host: string,
  database: string
) {
  const dataSource = await new DataSource(options).initialize();
  logMessage(LOG_TAG, `Connected to host: ${host} - db: ${database}`);
  return dataSource;
}

async function setup() {
  // connect to core db

  const qcDatasourceSlave = await getConnectedDatasource(
    configuration().qc.datasourceSlave,
    configuration().qc.datasourceSlave.host,
    configuration().qc.datasourceSlave.database
  );

  // connect to app db

  const dataSource = await getConnectedDatasource(
    configuration().datasource,
    configuration().datasource.host,
    configuration().datasource.database
  );

  return {
    qcDatasourceSlave,
    dataSource,
  };
}

async function createRootEntityIdMapTable(queryRunner: QueryRunner) {
  return queryRunner.query(`
    CREATE TABLE IF NOT EXISTS root_entity_id_map (id uuid PRIMARY KEY, "rootEntityId" uuid);
  `);
}
async function fetchEntityAdminEntityRoles(
  queryRunner: QueryRunner
): Promise<EntityRoleQueryResult[]> {
  return queryRunner.query(`
        SELECT
            DISTINCT 
            ue."userId"
            , er."entityId"
        FROM
            user_entity ue
        INNER JOIN entity_role er 
        ON
            ue."entityRoleId" = er.id
        WHERE
            er."roleCode" = 'ea'
        ;
    `);
}

async function __run__() {
  logMessage(LOG_TAG, "Job initializing...");

  const { qcDatasourceSlave, dataSource } = await setup();
  const qcQueryRunnerSlave = qcDatasourceSlave.createQueryRunner();
  const queryRunner = dataSource.createQueryRunner();

  await createRootEntityIdMapTable(queryRunner);
  const entityRoles = await fetchEntityAdminEntityRoles(qcQueryRunnerSlave);
  console.log(entityRoles.length);

  let insertResult: EntityRoleQueryResult[] = [];
  switch (configuration().datasource.database) {
    case "app_powerflow":
      insertResult = await insertEntityRoles(queryRunner, entityRoles);
      break;

    default:
      throw new Error("Unsupported database");
  }

  logMessage(
    LOG_TAG,
    `Inserted ${insertResult.length} records into root_entity_id_map`
  );

  const filename = generateOutputFilename(
    `${configuration().datasource.database}-patch-new-register-acl-${
      insertResult.length
    }`
  );
  const outputPath = `./results/${filename}.json`;
  logMessage(LOG_TAG, `Logging the results to file '${outputPath}'...`);
  await storeResultsToFile<EntityRoleQueryResult>(outputPath, insertResult);

  await qcDatasourceSlave.destroy();
  await dataSource.destroy();

  logMessage(
    LOG_TAG,
    `Job completed, total ${insertResult.length} records are processed.`
  );
}
__run__();
