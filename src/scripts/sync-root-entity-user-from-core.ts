import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import {
  generateOutputFilename,
  logMessage,
  storeResultsToFile,
} from "./lib/data-patch-util.helper";
import configuration from "../configs/configuration";
import {
  insertRootEntityUser,
  insertRootEntityUserV2,
  insertRootEntityUserV3,
} from "./script";
import { RootEntityUserQueryResult } from "./types/root-entity-user-query-result.type";

const LOG_TAG = "sync-root-entity-user-from-core.ts";

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

async function fetctRootEntityUserId(
  queryRunner: QueryRunner
): Promise<RootEntityUserQueryResult[]> {
  return queryRunner.query(`
    SELECT id, "userId", "rootEntityId", "createdAt" FROM root_entity_user reu ;
  `);
}

async function __run__() {
  logMessage(LOG_TAG, "Job initializing...");

  const { qcDatasourceSlave, dataSource } = await setup();
  const qcQueryRunnerSlave = qcDatasourceSlave.createQueryRunner();
  const queryRunner = dataSource.createQueryRunner();

  const rootEntityUsers = await fetctRootEntityUserId(qcQueryRunnerSlave);

  logMessage(LOG_TAG, `Total ${rootEntityUsers.length} root entity users records are fetched.`);

  let insertResults: RootEntityUserQueryResult[] = [];

  switch (configuration().datasource.database) {
    case "app_eventmanager":
    case "app_doctracker":
    case "app_aca":
    case "app_sci":
      insertResults = await insertRootEntityUser(queryRunner, rootEntityUsers);
      break;
    case "app_powerflow":

    case "app_fotolio":
      insertResults = await insertRootEntityUserV2(
        queryRunner,
        rootEntityUsers
      );
      break;

    case "app_punchlist":
    case "app_ier":
    case "app_quality_alert":
    case "app_inspection":
      insertResults = await insertRootEntityUserV3(
        queryRunner,
        rootEntityUsers
      );
      break;
    default:
      throw new Error("Unsupported database");
  }

  const filename = generateOutputFilename(
    `${configuration().datasource.database}-sync-root-entity-user-from-core-${
      insertResults.length
    }`
  );
  const outputPath = `./results/${filename}.json`;
  logMessage(LOG_TAG, `Logging the results to file '${outputPath}'...`);
  await storeResultsToFile<RootEntityUserQueryResult>(
    outputPath,
    insertResults
  );

  await qcDatasourceSlave.destroy();
  await dataSource.destroy();

  logMessage(
    LOG_TAG,
    `Job completed, total ${insertResults.length} records are processed.`
  );
}

__run__();
