const tableName = 'letter_versions'

module.exports = {

  async up (knex) {
    // Create the table
    await knex.schema
      .createTable(tableName, (table) => {
        // Auto-incrementing non-nullable unsigned integer primary key "id" field
        table.increments()

        // Simple fields
        table.string('template_id').notNullable()

        // Foreign key references
        table.integer('campaign_id').unsigned().notNullable()
        table.foreign('campaign_id').references('campaigns.id')

        // Fields using native enum types
        table
          .enum(
            'office_division',
            ['Federal', 'State', 'County', 'Municipality'],
            { useNative: true, enumName: 'political_division' }
          )
          .notNullable()
          .defaultTo('Federal')

        // More simple fields
        table.string('state')
        table.string('county')
        table.string('municipality')

        // Indexes
        table.index(['campaign_id'])

        // Unique indexes
        table.unique(['template_id'])
      })

    //
    // Special CHECK constraints to verify row integrity
    //

    // If "office_division" is set to 'Federal', then:
    //  - the value for "state" must be NULL
    //  - the value for "county" must be NULL
    //  - the value for "municipality" must be NULL
    await knex.raw(
      `
      ALTER TABLE "${tableName}"
      ADD CONSTRAINT "federal_division_has_no_locations"
      CHECK (
        office_division = 'Federal' AND
        state IS NULL AND
        county IS NULL AND
        municipality IS NULL
      );
      `
    )

    // If "office_division" is set to 'State', then:
    //  - the value for "state" must NOT be NULL
    //  - the value for "county" must be NULL
    //  - the value for "municipality" must be NULL
    await knex.raw(
      `
      ALTER TABLE "${tableName}"
      ADD CONSTRAINT "state_division_has_required_locations"
      CHECK (
        office_division = 'State' AND
        state IS NOT NULL AND
        county IS NULL AND
        municipality IS NULL
      );
      `
    )

    // If "office_division" is set to 'County', then:
    //  - the value for "state" must NOT be NULL
    //  - the value for "county" must NOT be NULL
    //  - the value for "municipality" must be NULL
    await knex.raw(
      `
      ALTER TABLE "${tableName}"
      ADD CONSTRAINT "county_division_has_required_locations"
      CHECK (
        office_division = 'County' AND
        state IS NOT NULL AND
        county IS NOT NULL AND
        municipality IS NULL
      );
      `
    )

    // If "office_division" is set to 'Municipality', then:
    //  - the value for "state" must NOT be NULL
    //  - the value for "county" may be NULL? ????
    //  - the value for "municipality" must NOT be NULL
    await knex.raw(
      `
      ALTER TABLE "${tableName}"
      ADD CONSTRAINT "municipality_division_has_required_locations"
      CHECK (
        office_division = 'Municipality' AND
        state IS NOT NULL AND
        municipality IS NOT NULL
      );
      `
    )
  },

  async down (knex) {
    // Drop the table (and its special CHECK constraints)
    await knex.schema.dropTable(tableName)

    // Manually remove the native enum types
    await knex.raw(`DROP TYPE IF EXISTS political_division;`)
  }

}
