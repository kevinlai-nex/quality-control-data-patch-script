import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join } from 'path';

export default () => {
  const YAML_CONFIG_FILENAME = process.env.CONFIG_FILE || 'db.config.yml';

  return load(
    readFileSync(join(__dirname, YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, any>;
};
