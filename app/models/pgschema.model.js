const pgp = require("pg-promise")(); //npm install pg-promise
const dbConfig = require("../config/db.config.js");
const sql = require("./db.js");

async function cloneSchemaWithoutData(sourceSchema, destinationSchema) {
  try {
    // Replace with your actual database connection details
    const connectionConfig = {
      user: dbConfig.USER,
      host: dbConfig.HOST,
      database: dbConfig.DB,
      password: dbConfig.PASSWORD,
      port: 5432,
    };

    const scemaExist = await sql.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${destinationSchema}'`
    );
    if (scemaExist.rows.length == 0) {
      // Create two database objects - one for the source and one for the destination schema
      const dbSource = pgp(connectionConfig);
      const dbDestination = pgp({
        ...connectionConfig,
        database: connectionConfig.database,
      });

      // Step 2: Retrieve the structure of the source schema
      const schemaQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_type = 'BASE TABLE';
        `;
      const tables = await dbSource.any(schemaQuery, [sourceSchema]);

      // Step 3: Create the destination schema
      const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS "${destinationSchema}"`;
      await dbDestination.none(createSchemaQuery);

      // Step 4: Recreate the structure of the source schema in the destination schema
      for (const table of tables) {
        const tableName = table.table_name;
        const createTableQuery = `CREATE TABLE ${destinationSchema}.${tableName} (LIKE ${sourceSchema}.${tableName} INCLUDING ALL)`;
        await dbDestination.none(createTableQuery);
        
        // Start: Handle triggers
        const triggers = await dbSource.any(`
          SELECT tgname, pg_get_triggerdef(oid) as tgdef
          FROM pg_trigger
          WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2)) AND tgname NOT LIKE 'RI_ConstraintTrigger_%'
        `, [tableName, sourceSchema]);

        for (const { tgname, tgdef } of triggers) {
          // Modify the trigger definition for the new schema and table
          const modifiedTgdef = tgdef.replace(new RegExp(` ON ${sourceSchema}\\.${tableName}`, 'g'), ` ON ${destinationSchema}.${tableName}`);
          await dbDestination.none(modifiedTgdef);
        }
        // End: Handle triggers
      }

      // Start: Handle Key Constraints
      const foreignKeys = await dbSource.any(`
          SELECT 
          conname, 
          pg_get_constraintdef(c.oid) AS condef, 
          cls.relname AS table_name
        FROM 
          pg_constraint c
          JOIN pg_namespace n ON n.oid = c.connamespace
          JOIN pg_class cls ON cls.oid = c.conrelid
        WHERE 
          n.nspname = $1 AND c.contype != 'p'`, [sourceSchema]);

      for (const { conname, condef, table_name } of foreignKeys) {
        const modifiedCondef = condef.replace(new RegExp(`${sourceSchema}\\.`,'g'), `${destinationSchema}.`);
        await dbDestination.none(`
          ALTER TABLE ${destinationSchema}.${table_name} DROP CONSTRAINT IF EXISTS ${conname};
        `);
        await dbDestination.none(`
          ALTER TABLE ${destinationSchema}.${table_name}
          ADD CONSTRAINT ${conname} ${modifiedCondef}
        `);
      }
      // End: Handle Key Constraints

      // Step 4: To fetch and clone views by Abhishek
      const schemaViewsQuery = `SELECT viewname, definition FROM pg_views WHERE schemaname = $1`;
      const views = await dbSource.any(schemaViewsQuery, [sourceSchema]);

      for (const view of views) {
        const createViewQuery = `
          CREATE OR REPLACE VIEW ${destinationSchema}.${view.viewname} AS
          ${view.definition}
        `;
        await dbDestination.none(createViewQuery);
      }

      // Handle sequences
      const sequences = await dbSource.any(`
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = $1
      `, [sourceSchema]);

      for (const { sequence_name } of sequences) {        
        // If the sequence does not exist, create it
        await dbDestination.none(`
          CREATE SEQUENCE ${destinationSchema}.${sequence_name}
          OWNED BY NONE;
        `);

        // Set the current value of the sequence
        const currentValue = await dbSource.one(`
          SELECT last_value
          FROM ${sourceSchema}.${sequence_name}
        `);

        await dbDestination.one(`
          SELECT setval('${destinationSchema}.${sequence_name}', $1)
        `, [currentValue.last_value]);
      }

      console.log("Schema cloned successfully!");
      return { status: 200, message: "Schema cloned successfully!" };
    }
    return { status: 200, message: "Schema already exist" };
  } catch (error) {
    console.error("Error occurred:", error);
    return { status: "error", message: error.message };
  } finally {
    pgp.end(); // Close the connections
  }
}

async function updateSchemaWithoutData(sourceSchema, destinationSchema) {
  try {
    // Replace with your actual database connection details
    const connectionConfig = {
      user: dbConfig.USER,
      host: dbConfig.HOST,
      database: dbConfig.DB,
      password: dbConfig.PASSWORD,
      port: 5432,
    };

    const scemaExist = await sql.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${destinationSchema}'`
    );
    if (scemaExist.rows.length == 1) {
      // Create two database objects - one for the source and one for the destination schema
      const dbSource = pgp(connectionConfig);
      const dbDestination = pgp({
        ...connectionConfig,
        database: connectionConfig.database,
      });

      // Create the destination schema If Not Exists
      const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS "${destinationSchema}"`;
      await dbDestination.none(createSchemaQuery);

      // Retrieve the structure of the source schema
      const schemaQuery = `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE';`;
      const tables = await dbSource.any(schemaQuery, [sourceSchema]);

      // Iterate over each table to clone structure and data
      for (const { table_name } of tables) {
        // Check if the table already exists in the target schema
        const tableExists = await dbSource.oneOrNone(`SELECT (EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2))::int`, [destinationSchema, table_name]);
        
        if (!tableExists.exists) {
          // If the table does not exist, create it
          const createTableQuery = `CREATE TABLE ${destinationSchema}.${table_name} (LIKE ${sourceSchema}.${table_name} INCLUDING ALL)`;
          await dbDestination.none(createTableQuery);
        } else {
          // Get columns from the source and target tables
          const sourceColumns = await dbSource.any(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
          `, [sourceSchema, table_name]);

          const targetColumns = await dbSource.any(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
          `, [destinationSchema, table_name]);

          const targetColumnNames = targetColumns.map(col => col.column_name);

          // Add missing columns to the target table
          for (const sourceCol of sourceColumns) {
            if (!targetColumnNames.includes(sourceCol.column_name)) {
              let columnDef = `${sourceCol.column_name} ${sourceCol.data_type}`;
              if (sourceCol.is_nullable === 'NO') {
                columnDef += ' NOT NULL';
              }
              if (sourceCol.column_default !== null) {
                columnDef += ` DEFAULT ${sourceCol.column_default}`;
              }
              await dbDestination.none(`ALTER TABLE ${destinationSchema}.${table_name} ADD COLUMN ${columnDef}`);
            }
          }
        }
      }

      // Start: Handle triggers
      const triggers = await dbSource.any(`
          SELECT 
          tgname, 
          pg_get_triggerdef(t.oid) AS tgdef, 
          c.relname AS table_name
        FROM 
          pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE 
          n.nspname = $1 AND NOT t.tgisinternal
      `, [sourceSchema]);

      for (const { tgname, tgdef, table_name } of triggers) {

        const triggerExists = await dbSource.oneOrNone(`
          SELECT 1
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE 
            n.nspname = $1 
            AND c.relname = $2 
            AND t.tgname = $3
        `, [destinationSchema, table_name, tgname]);

        if (!triggerExists) {
          // Modify the trigger definition for the new schema and table
          const modifiedTgdef = tgdef.replace(new RegExp(` ON ${sourceSchema}\\.${table_name}`, 'g'), ` ON ${destinationSchema}.${table_name}`);
          await dbDestination.none(modifiedTgdef);
        }        
      }
      // End: Handle triggers

      // Handle views
      const allViews = await dbSource.any(`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = $1
      `, [sourceSchema]);

      for (const { table_name } of allViews) {
        // Check if the view already exists in the target schema
        const viewExists = await dbSource.oneOrNone(`
          SELECT 1
          FROM information_schema.views
          WHERE table_schema = $1 AND table_name = $2
        `, [destinationSchema, table_name]);

        if (!viewExists) {
          // Create the view in the target schema
          const viewDefinition = await dbSource.one(`
            SELECT view_definition
            FROM information_schema.views
            WHERE table_schema = $1 AND table_name = $2
          `, [sourceSchema, table_name]);

          await dbDestination.none(`
            CREATE VIEW ${destinationSchema}.${table_name} AS ${viewDefinition.view_definition}
          `);
        }
      }

      // Handle foreign keys and other constraints
      const constraints = await dbSource.any(`
        SELECT 
          c.conname, 
          pg_get_constraintdef(c.oid) AS condef, 
          cls.relname AS table_name
        FROM 
          pg_constraint c
          JOIN pg_namespace n ON n.oid = c.connamespace
          JOIN pg_class cls ON cls.oid = c.conrelid
        WHERE 
          n.nspname = $1 AND c.contype != 'p'`, [sourceSchema]);

      for (const { conname, condef, table_name } of constraints) {

        const constraintExists = await dbSource.any(`
          SELECT 
            1
          FROM 
            pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            JOIN pg_class cls ON cls.oid = c.conrelid
          WHERE 
            n.nspname=$1 AND c.conname=$2 AND cls.relname=$3 AND c.contype != 'p'`, [sourceSchema, conname, table_name]);

        if(!constraintExists){
          // Alter constraint definitions for the new schema
          const modifiedCondef = condef.replace(new RegExp(`${sourceSchema}\\.`,'g'), `${destinationSchema}.`);
          await dbDestination.none(`
            ALTER TABLE ${destinationSchema}.${table_name}
            ADD CONSTRAINT ${conname} ${modifiedCondef}
          `);
        }
                      
      }

      // Handle sequences
      const sequences = await dbSource.any(`
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = $1
      `, [sourceSchema]);

      for (const { sequence_name } of sequences) {
        // Check if the sequence already exists in the target schema
        const sequenceExists = await dbSource.oneOrNone(`
          SELECT 1
          FROM information_schema.sequences
          WHERE sequence_schema = $1 AND sequence_name = $2
        `, [destinationSchema, sequence_name]);

        if (!sequenceExists) {
          // If the sequence does not exist, create it
          await dbDestination.none(`
            CREATE SEQUENCE ${destinationSchema}.${sequence_name}
            OWNED BY NONE;
          `);

          // Set the current value of the sequence
          const currentValue = await dbSource.one(`
            SELECT last_value
            FROM ${sourceSchema}.${sequence_name}
          `);

          await dbDestination.one(`
            SELECT setval('${destinationSchema}.${sequence_name}', $1)
          `, [currentValue.last_value]);
        }
      }
      console.log("Schema Update successfully!");
      return { status: 200, message: "Schema Update successfully!" };
    }
    return { status: 200, message: "Schema already exist" };
  } catch (error) {
    console.error("Error occurred:", error);
    return { status: "error", message: error.message };
  } finally {
    pgp.end(); // Close the connections
  }
}

// // Call the function with the source and destination schema names
// cloneSchemaWithoutData('client1', 'client2');\

module.exports = { cloneSchemaWithoutData, updateSchemaWithoutData };
