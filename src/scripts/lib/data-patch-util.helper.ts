import * as _ from 'lodash';
import * as fs from 'fs/promises';

export function logMessage(LOG_TAG: string, message: string) {
  console.log(`\n=== (${LOG_TAG}): ${message} ===`);
}

export function generateOutputFilename(filename: string) {
  const date = new Date();
  const year = '' + date.getFullYear();
  const month = _.padStart('' + (date.getMonth() + 1), 2, '0');
  const day = _.padStart('' + date.getDate(), 2, '0');
  const hour = _.padStart('' + date.getHours(), 2, '0');
  const minute = _.padStart('' + date.getMinutes(), 2, '0');
  const second = _.padStart('' + date.getSeconds(), 2, '0');
  return `${year + month + day + hour + minute + second}-${filename}`;
}

export async function storeResultsToFile<T>(
  outputPath: string,
  updateResults: T[],
) {
  await fs.writeFile(outputPath, JSON.stringify(updateResults, null, '\t'));
}
