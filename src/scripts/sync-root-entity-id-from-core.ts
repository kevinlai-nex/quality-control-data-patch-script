import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import {
  generateOutputFilename,
  logMessage,
  storeResultsToFile,
} from "./lib/data-patch-util.helper";
import configuration from "../configs/configuration";
import {
  insertRootEntityIdMap,
  updateEntityRootEntityId,
  updateEntityRootEntityIdV2,
} from "./script";
import { OperationEntityQueryResult } from "./types/operation-entity-query-result.type";

const LOG_TAG = "sync-root-entity-id-from-core.ts";

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

async function fetchOperationEntity(
  queryRunner: QueryRunner
): Promise<OperationEntityQueryResult[]> {
  return queryRunner.query(`
    SELECT id, "rootEntityId" FROM operation_entity;
  `);
}

async function __run__() {
  logMessage(LOG_TAG, "Job initializing...");

  const { qcDatasourceSlave, dataSource } = await setup();
  const qcQueryRunnerSlave = qcDatasourceSlave.createQueryRunner();
  const queryRunner = dataSource.createQueryRunner();

  await createRootEntityIdMapTable(queryRunner);
  const operationEntities = await fetchOperationEntity(qcQueryRunnerSlave);
  console.log(operationEntities.length);

  const insertResult = await insertRootEntityIdMap(
    queryRunner,
    operationEntities
  );

  logMessage(
    LOG_TAG,
    `Inserted ${insertResult.length} records into root_entity_id_map`
  );

  let updateResult: OperationEntityQueryResult[] = [];
  switch (configuration().datasource.database) {
    case "app_eventmanager":
    case "app_doctracker":
    case "app_aca":
    case "app_sci":
      updateResult = (await updateEntityRootEntityId(queryRunner))[0];
      break;
    case "app_quality_alert":
    case "app_ier":
    case "app_punchlist":
    case "app_fotolio":
      updateResult = (await updateEntityRootEntityIdV2(queryRunner))[0];
      break;

    default:
      throw new Error("Unsupported database");
  }

  logMessage(
    LOG_TAG,
    `Updated ${updateResult.length} records in entity_initialization`
  );

  const filename = generateOutputFilename(
    `${configuration().datasource.database}-sync-root-entity-id-from-core-${
      updateResult.length
    }`
  );
  const outputPath = `./results/${filename}.json`;
  logMessage(LOG_TAG, `Logging the results to file '${outputPath}'...`);
  await storeResultsToFile<OperationEntityQueryResult>(
    outputPath,
    updateResult
  );

  await qcDatasourceSlave.destroy();
  await dataSource.destroy();

  logMessage(
    LOG_TAG,
    `Job completed, total ${updateResult.length} records are processed.`
  );
}
__run__();
