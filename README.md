# Quality Control Data Patch Script

This repo is used for running a data patch script to deploy Backend 24' Sprint 14 to production. It contains two scripts:

1. `src/scripts/sync-root-entity-id-from-core.ts`: This script is used to sync the root entity Id from the core database to the `entity_initialization` table.

2. `src/scripts/sync-root-entity-user-from-core.ts`: This script is used to sync the root entity user from the core database to the `root_entity_user` table.

## Prerequisites

- Node.js installed
- PostgreSQL database connection details configured in the \`configs/configuration.ts\` file

## Installation

1. Clone the repository
2. Install dependencies by running `yarn`

## Usage

# Instructions for running the quality control data patch script

1. Update the database connection details in the `configs/db.config.yml` file.
2. Run the script by executing the following command:
    ```
    CONFIG_FILE=db.config.yml yarn ts-node <PATH_TO_SCRIPT>
    ```
3. The result will be written to the results folder.

